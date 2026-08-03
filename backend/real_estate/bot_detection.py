"""
Server-side crawler detection for analytics.

Search engines and AI assistants execute JavaScript, so they fire the same
analytics beacon a person does and end up in ``ActivityEvent`` looking like
sessions: roughly 78% of the recorded sessions were crawlers, which made the
admin panel read about 5x high.

This module is about COUNTING, never about ACCESS: nothing here blocks a
request. Crawlers keep full access to every page and every API endpoint; their
events are simply stored with ``is_bot=True`` so human-facing metrics can leave
them out while bot traffic remains available for its own charts.
"""

import re


# Distinctive vendor and tooling tokens. These strings never show up in a real
# browser User-Agent, so a plain substring match is safe for them.
_NAMED_BOT_PATTERNS = [
    # Search engines
    r"googlebot",
    r"google-inspectiontool",
    r"googleother",
    r"google-extended",
    r"storebot-google",
    r"chrome-lighthouse",
    r"adsbot-google",
    r"mediapartners-google",
    r"bingbot",
    r"bingpreview",
    r"adidxbot",
    r"msnbot",
    r"slurp",
    r"duckduckbot",
    r"duckduckgo-favicons-bot",
    r"baiduspider",
    # Only Yandex's crawlers: plain "yandex" would also match YandexBrowser,
    # which is a real person's browser.
    r"yandex[a-z]*bot",
    r"yandex\.com/bots",
    r"seznambot",
    r"naverbot",
    r"qwantify",
    r"exabot",
    # AI crawlers and assistants
    r"gptbot",
    r"oai-searchbot",
    r"chatgpt-user",
    r"claudebot",
    r"claude-web",
    r"claude-user",
    r"claude-searchbot",
    r"anthropic",
    r"perplexitybot",
    r"perplexity-user",
    r"youbot",
    r"cohere-ai",
    r"diffbot",
    r"omgili",
    r"timpibot",
    r"img2dataset",
    r"ccbot",
    # Platform fetchers and link previewers
    r"applebot",
    r"amazonbot",
    r"meta-externalagent",
    r"meta-externalfetcher",
    r"facebookexternalhit",
    r"facebookcatalog",
    r"twitterbot",
    r"linkedinbot",
    r"pinterest",
    r"slackbot",
    r"telegrambot",
    r"whatsapp",
    r"discordbot",
    r"embedly",
    r"quora link preview",
    r"redditbot",
    r"skypeuripreview",
    r"vkshare",
    r"nuzzel",
    r"outbrain",
    # SEO and market intelligence suites
    r"ahrefsbot",
    r"ahrefssiteaudit",
    r"semrushbot",
    r"mj12bot",
    r"dotbot",
    r"dataforseobot",
    r"screaming frog",
    r"rogerbot",
    r"blexbot",
    r"seokicks",
    r"sistrix",
    r"barkrowler",
    r"serpstatbot",
    r"zoominfobot",
    r"linkdexbot",
    r"gtmetrix",
    r"pagespeed",
    r"pingdom",
    r"uptimerobot",
    r"statuscake",
    r"site24x7",
    # Aggressive/abusive scrapers
    r"bytespider",
    r"bytedance",
    r"petalbot",
    r"mauibot",
    r"dnyzbot",
    r"magpie-crawler",
    r"netestate",
    r"trendictionbot",
    r"turnitinbot",
    r"grapeshot",
    r"nutch",
    r"heritrix",
    r"archive\.org_bot",
    r"ia_archiver",
    # Headless browsers and automation frameworks
    r"headlesschrome",
    r"headless",
    r"phantomjs",
    r"puppeteer",
    r"playwright",
    r"selenium",
    r"webdriver",
    r"cypress",
    r"electron/",
    r"lighthouse",
    # HTTP clients and scripting libraries
    r"python-requests",
    r"python-urllib",
    r"python-httpx",
    r"aiohttp",
    r"httpx/",
    r"scrapy",
    r"mechanize",
    r"beautifulsoup",
    # Bounded so they cannot match inside an unrelated product token.
    r"(?<![a-z])curl(?![a-z])",
    r"(?<![a-z])wget(?![a-z])",
    r"go-http-client",
    r"okhttp",
    r"java/",
    r"jakarta",
    r"apache-httpclient",
    r"libwww",
    r"lwp::simple",
    r"guzzlehttp",
    r"symfony httpclient",
    r"axios/",
    r"node-fetch",
    r"undici",
    r"got \(",
    r"restsharp",
    r"postmanruntime",
    r"insomnia",
    r"httpie",
    r"php/",
    r"ruby/",
    r"dart:io",
    r"powershell",
    r"winhttp",
    r"zgrab",
    r"masscan",
    r"nmap",
]

# Generic tokens. "bot", "crawler" and "spider" are matched with word-ish
# boundaries so ordinary words never trigger them: "about", "abbot", "sabot"
# and "turbot" are excluded explicitly, and a trailing letter (as in "bottle"
# or "spiderman") stops the match. A suffix like "SomeVendorBot/1.0" still
# matches because only the character AFTER the token is constrained.
_GENERIC_BOT_PATTERNS = [
    r"(?<!\ba)(?<!\bab)(?<!\bsa)(?<!\btur)bots?(?![a-z])",
    r"crawler(?![a-z])",
    r"crawling(?![a-z])",
    r"spider(?![a-z])",
    r"scraper(?![a-z])",
    r"fetcher(?![a-z])",
    r"validator(?![a-z])",
    r"monitoring(?![a-z])",
    r"feed(?:parser|fetcher)(?![a-z])",
]

# Single compiled regex: one pass over the User-Agent per request.
BOT_USER_AGENT_RE = re.compile(
    "|".join(_NAMED_BOT_PATTERNS + _GENERIC_BOT_PATTERNS),
    re.IGNORECASE,
)


def is_bot_user_agent(user_agent) -> bool:
    """Return True when the User-Agent string looks like a non-human client.

    A missing or empty User-Agent counts as a bot: every real browser sends
    one, so its absence means a script or a headless client.
    """
    if not user_agent:
        return True
    return bool(BOT_USER_AGENT_RE.search(str(user_agent)))


def is_bot_request(request) -> bool:
    """Return True when the request comes from a crawler, script or headless client.

    Detection is User-Agent based and deliberately server-side: the client
    never gets to say whether it is a bot. The result is only used to flag
    analytics rows, never to deny a response.
    """
    if request is None:
        return True
    meta = getattr(request, "META", None) or {}
    return is_bot_user_agent(meta.get("HTTP_USER_AGENT", ""))
