import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';

export default function TeamPartnersSection({ teamId }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    partner_name: '',
    partnership_type: '',
    logo_url: '',
    website_url: '',
    contact_email: '',
    contact_person: '',
    notes: '',
  });
  const queryClient = useQueryClient();

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['teamPartners', teamId],
    queryFn: () => base44.entities.TeamPartner.filter({ team_id: teamId }),
    enabled: !!teamId,
  });

  const createPartnerMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamPartner.create({
      ...data,
      team_id: teamId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamPartners', teamId] });
      setFormData({
        partner_name: '',
        partnership_type: '',
        logo_url: '',
        website_url: '',
        contact_email: '',
        contact_person: '',
        notes: '',
      });
      setShowAddForm(false);
      toast.success('Partner added');
    },
  });

  const deletePartnerMutation = useMutation({
    mutationFn: (id) => base44.entities.TeamPartner.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamPartners', teamId] });
      toast.success('Partner removed');
    },
  });

  const handleAddPartner = () => {
    if (!formData.partner_name) {
      toast.error('Partner name is required');
      return;
    }
    createPartnerMutation.mutate(formData);
  };

  if (isLoading) {
    return <Card className="p-6">Loading...</Card>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Partners & Sponsors</CardTitle>
            <CardDescription>Manage team's sponsors and partners</CardDescription>
          </div>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Partner
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {showAddForm && (
          <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
            <h3 className="font-semibold text-sm">New Partner</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="partner_name">Partner Name *</Label>
                <Input
                  id="partner_name"
                  value={formData.partner_name}
                  onChange={(e) => setFormData({ ...formData, partner_name: e.target.value })}
                  placeholder="e.g., ABC Corporation"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="partnership_type">Type</Label>
                <Input
                  id="partnership_type"
                  value={formData.partnership_type}
                  onChange={(e) => setFormData({ ...formData, partnership_type: e.target.value })}
                  placeholder="e.g., Title Sponsor, Technical Partner"
                  className="mt-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Name"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="email@example.com"
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="website_url">Website URL</Label>
              <Input
                id="website_url"
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                placeholder="https://example.com"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Partnership details or terms"
                className="mt-2"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleAddPartner}
                disabled={createPartnerMutation.isPending}
                className="bg-gray-900 hover:bg-gray-800"
              >
                {createPartnerMutation.isPending ? 'Adding...' : 'Add Partner'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({
                    partner_name: '',
                    partnership_type: '',
                    logo_url: '',
                    website_url: '',
                    contact_email: '',
                    contact_person: '',
                    notes: '',
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {partners.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No partners added yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {partners.map((partner) => (
              <div key={partner.id} className="border rounded-lg p-4 bg-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{partner.partner_name}</h4>
                    <div className="mt-2 space-y-2 text-sm text-gray-600">
                      {partner.partnership_type && (
                        <div><span className="font-medium">Type:</span> {partner.partnership_type}</div>
                      )}
                      {partner.contact_person && (
                        <div><span className="font-medium">Contact:</span> {partner.contact_person}</div>
                      )}
                      {partner.contact_email && (
                        <div><span className="font-medium">Email:</span> {partner.contact_email}</div>
                      )}
                      {partner.website_url && (
                        <div>
                          <span className="font-medium">Website:</span>{' '}
                          <a href={partner.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {partner.website_url}
                          </a>
                        </div>
                      )}
                      {partner.notes && (
                        <div className="italic mt-2">{partner.notes}</div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePartnerMutation.mutate(partner.id)}
                    disabled={deletePartnerMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}