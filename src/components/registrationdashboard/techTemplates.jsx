/**
 * Tech inspection checklist templates.
 * Each item: { id, label, required }
 */

const GENERAL_MOTORSPORTS = [
  { id: 'gm_helmet', label: 'Helmet present and approved', required: true },
  { id: 'gm_harness', label: 'Harness/belts functional and secured', required: true },
  { id: 'gm_fuel', label: 'Fuel system secure, no leaks', required: true },
  { id: 'gm_brakes', label: 'Brakes functional', required: true },
  { id: 'gm_steering', label: 'Steering responsive, no excessive play', required: true },
  { id: 'gm_tires', label: 'Tires: condition, tread, inflation', required: true },
  { id: 'gm_suspension', label: 'Suspension intact', required: false },
  { id: 'gm_engine', label: 'Engine runs smoothly', required: false },
  { id: 'gm_lights', label: 'Lights operational', required: false },
  { id: 'gm_electrical', label: 'Electrical / kill switch OK', required: false },
];

const OFF_ROAD_TRUCK = [
  { id: 'ort_cage', label: 'Roll cage secure, all welds intact', required: true },
  { id: 'ort_harness', label: 'Seat and harness secure, no damage', required: true },
  { id: 'ort_fuel_cell', label: 'Fuel cell properly mounted, no leaks', required: true },
  { id: 'ort_fire_ext', label: 'Fire extinguisher accessible', required: true },
  { id: 'ort_tie_rods', label: 'Tie rods and steering — no play', required: true },
  { id: 'ort_arms', label: 'A-arms and control arms — no bending', required: true },
  { id: 'ort_shocks', label: 'Shocks functional, no leaks, full travel', required: false },
  { id: 'ort_skid', label: 'Skid plate intact', required: false },
  { id: 'ort_tires', label: 'Tires and wheels: lug nuts tight, tread OK', required: false },
  { id: 'ort_lights', label: 'Lights and kill switch working', required: false },
];

const SXS_UTV = [
  { id: 'sxs_cage', label: 'Roll cage / ROPS intact', required: true },
  { id: 'sxs_nets', label: 'Door nets / intrusion protection present', required: true },
  { id: 'sxs_harness', label: 'Harness and seats secure', required: true },
  { id: 'sxs_helmet', label: 'Helmet present', required: true },
  { id: 'sxs_fuel', label: 'Fuel system secure', required: true },
  { id: 'sxs_steering', label: 'Steering responsive', required: true },
  { id: 'sxs_suspension', label: 'Suspension and CV joints intact', required: false },
  { id: 'sxs_tires', label: 'Tires: pressure and condition', required: false },
  { id: 'sxs_brakes', label: 'Brakes responsive', required: false },
  { id: 'sxs_kill', label: 'Kill switch operational', required: false },
];

/**
 * Returns the appropriate checklist for a given class name.
 * @param {string} seriesClassName
 * @returns {{ id: string, label: string, required: boolean }[]}
 */
export function getTemplateForClass(seriesClassName) {
  const name = (seriesClassName || '').toLowerCase();
  if (name.includes('truck') || (name.includes('pro') && name.includes('truck'))) {
    return OFF_ROAD_TRUCK;
  }
  if (name.includes('sxs') || name.includes('utv')) {
    return SXS_UTV;
  }
  return GENERAL_MOTORSPORTS;
}

export const TEMPLATE_NAMES = {
  GENERAL_MOTORSPORTS: 'General Motorsports',
  OFF_ROAD_TRUCK: 'Off Road Truck',
  SXS_UTV: 'SxS / UTV',
};