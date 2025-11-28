const whatsappHref =
  'https://wa.me/593983738151?text=Hola%20necesito%20ayuda%20con%20Geo%20Propiedades';

const Footer = () => (
  <footer className="bg-dark text-textSecondary text-center py-1.5 px-2 text-xs">
    © {new Date().getFullYear()}{' '}
    <a
      href={whatsappHref}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-2 hover:text-white transition-colors"
    >
      Geo Propiedades Ecuador
    </a>
    . Todos los derechos reservados.
  </footer>
);

export default Footer;
