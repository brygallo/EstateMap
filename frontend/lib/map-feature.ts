export function getMapFeatureProperty(properties: any[], featureId: unknown): any | null {
  if (featureId == null) return null;
  return properties.find((property) => String(property?.id) === String(featureId)) ?? null;
}
