import type { ResourceAmounts, ResourceId } from '../sim/types';

export const RESOURCE_NAMES_ES: Record<ResourceId, string> = {
  energy: 'energía',
  oxygenReserve: 'oxígeno de reserva',
  oxygen: 'oxígeno',
  water: 'agua',
  minerals: 'minerales',
  titanium: 'titanio',
  seeds: 'semillas',
  substrate: 'sustrato',
  rations: 'raciones',
  vegetables: 'vegetales',
  protein: 'proteína',
  plantWaste: 'restos vegetales',
  humanWaste: 'desechos',
  nitrogen: 'nitrógeno',
};

/** "20 titanio, 3 semillas" */
export function formatAmounts(amounts: ResourceAmounts): string {
  const parts = (Object.entries(amounts) as [ResourceId, number][]).map(
    ([res, amount]) => `${amount} ${RESOURCE_NAMES_ES[res]}`,
  );
  return parts.length > 0 ? parts.join(', ') : 'nada';
}
