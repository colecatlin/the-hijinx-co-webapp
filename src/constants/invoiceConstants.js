export const STATUS_CONFIG = {
  draft:   { label: 'Draft',   color: 'bg-gray-100 text-gray-600' },
  issued:  { label: 'Issued',  color: 'bg-blue-100 text-blue-700' },
  paid:    { label: 'Paid',    color: 'bg-green-100 text-green-700' },
  overdue: { label: 'Overdue', color: 'bg-orange-100 text-orange-700' },
  void:    { label: 'Void',    color: 'bg-red-100 text-red-600' },
};

export const LINE_TYPES = [
  'driver_registration', 'team_registration', 'credential_fee',
  'paddock_fee', 'service_charge', 'operational_fee', 'other',
];

export const INVOICE_TYPES = ['registration', 'operational', 'credential', 'service', 'other'];

export const EMPTY_INVOICE = {
  invoice_number: '', invoice_status: 'draft', invoice_type: 'registration',
  issuing_entity_type: 'Admin', issuing_entity_id: '', issuing_entity_name: '',
  recipient_entity_type: 'Driver', recipient_entity_id: '',
  recipient_name_snapshot: '', recipient_email: '',
  subtotal: 0, tax_amount: 0, total_amount: 0, currency: 'USD',
  due_date: '', notes: '', event_id: '',
};

export const EMPTY_LINE = {
  line_type: 'driver_registration', description: '', quantity: 1, unit_price: 0, line_total: 0,
  linked_entity_type: '', linked_entity_id: '',
};