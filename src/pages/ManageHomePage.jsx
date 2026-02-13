import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Home, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function ManageHomePage() {
  const queryClient = useQueryClient();

  const { data: content = [] } = useQuery({
    queryKey: ['homePageContent'],
    queryFn: () => base44.entities.HomePageContent.list(),
  });

  const activeContent = content.find(c => c.active) || content[0] || {};
  
  const [formData, setFormData] = useState({
    hero_eyebrow: '',
    hero_title: '',
    hero_subtitle: '',
  });

  React.useEffect(() => {
    if (activeContent) {
      setFormData({
        hero_eyebrow: activeContent.hero_eyebrow || '',
        hero_title: activeContent.hero_title || '',
        hero_subtitle: activeContent.hero_subtitle || '',
      });
    }
  }, [activeContent]);

  const updateMutation = useMutation({
    mutationFn: (data) => {
      if (activeContent?.id) {
        return base44.entities.HomePageContent.update(activeContent.id, data);
      } else {
        return base44.entities.HomePageContent.create({ ...data, active: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homePageContent'] });
      toast.success('Home page content updated');
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  return (
    <PageShell className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Home className="w-8 h-8 text-[#232323]" />
          <div>
            <h1 className="text-3xl font-black text-[#232323]">Home Page Management</h1>
            <p className="text-gray-600 text-sm">Manage home page hero content</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Hero Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Eyebrow Text (small text above title)
              </label>
              <Input
                value={formData.hero_eyebrow}
                onChange={(e) => setFormData({ ...formData, hero_eyebrow: e.target.value })}
                placeholder="e.g., The Hijinx Co LLC"
              />
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Hero Title
              </label>
              <Textarea
                value={formData.hero_title}
                onChange={(e) => setFormData({ ...formData, hero_title: e.target.value })}
                placeholder="e.g., Media. Motorsports. Culture. Built Different."
                rows={3}
                className="font-bold text-lg"
              />
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Hero Subtitle
              </label>
              <Textarea
                value={formData.hero_subtitle}
                onChange={(e) => setFormData({ ...formData, hero_subtitle: e.target.value })}
                placeholder="A multi-vertical platform operating at the intersection of editorial publishing, competitive motorsports, technology, and lifestyle."
                rows={3}
              />
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button 
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-[#232323] hover:bg-[#1A3249]"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Changes will be reflected on the home page immediately after saving.
          </p>
        </div>
      </div>
    </PageShell>
  );
}