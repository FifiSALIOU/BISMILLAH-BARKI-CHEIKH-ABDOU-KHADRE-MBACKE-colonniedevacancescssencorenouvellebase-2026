import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, MapPin, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import ImportExcel from './ImportExcel';

interface SiteConfig {
  id: string;
  nom: string;
  code: string;
  description: string;
}

export default function GestionSites() {
  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://127.0.0.1:8000';
  const [sites, setSites] = useState<SiteConfig[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteConfig | null>(null);
  const [form, setForm] = useState({ nom: '', code: '', description: '' });
  const [codeError, setCodeError] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  const fetchSites = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    const response = await fetch(`${API_BASE_URL}/admin/sites`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const data = await response.json();
    if (!Array.isArray(data)) return;
    setSites(
      data.map((s) => ({
        id: String(s.id),
        nom: String(s.nom),
        code: String(s.code),
        description: s.description ? String(s.description) : '',
      })),
    );
  };

  useEffect(() => {
    void fetchSites();
  }, []);

  const handleImportSites = async (data: any[]) => {
    let success = 0;
    const errors: { ligne: number; message: string }[] = [];
    const token = localStorage.getItem('access_token');
    if (!token) {
      return { success: 0, errors: [{ ligne: 1, message: 'Session expirée. Reconnectez-vous.' }] };
    }
    for (let i = 0; i < data.length; i += 1) {
      const row = data[i];
      if (!row.nom || !row.code) { errors.push({ ligne: i + 2, message: 'Champs obligatoires manquants (nom, code)' }); continue; }
      const code = row.code.toUpperCase().replace(/\s/g, '');
      try {
        const response = await fetch(`${API_BASE_URL}/admin/sites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nom: row.nom,
            code,
            description: row.description || null,
          }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          errors.push({ ligne: i + 2, message: payload?.detail || 'Erreur backend' });
          continue;
        }
        success++;
      } catch {
        errors.push({ ligne: i + 2, message: 'Impossible de joindre le backend' });
      }
    }
    await fetchSites();
    return { success, errors };
  };

  const openAdd = () => {
    setEditingSite(null);
    setForm({ nom: '', code: '', description: '' });
    setCodeError('');
    setDialogOpen(true);
  };

  const openEdit = (site: SiteConfig) => {
    setEditingSite(site);
    setForm({ nom: site.nom, code: site.code, description: site.description });
    setCodeError('');
    setDialogOpen(true);
  };

  const handleCodeChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/\s/g, '');
    setForm(f => ({ ...f, code: cleaned }));
    const isDuplicate = sites.some(s => s.code === cleaned && s.id !== editingSite?.id);
    setCodeError(isDuplicate ? 'Ce code existe déjà, veuillez en choisir un autre' : '');
  };

  const handleSave = async () => {
    if (!form.nom.trim() || !form.code.trim()) {
      toast.error('Le nom et le code sont obligatoires');
      return;
    }
    if (codeError) {
      toast.error(codeError);
      return;
    }
    const isDuplicate = sites.some(s => s.code === form.code && s.id !== editingSite?.id);
    if (isDuplicate) {
      toast.error('Ce code existe déjà, veuillez en choisir un autre');
      return;
    }
    const token = localStorage.getItem('access_token');
    if (!token) {
      toast.error('Session expirée. Reconnectez-vous.');
      return;
    }
    try {
      const isEdit = !!editingSite;
      const response = await fetch(
        isEdit ? `${API_BASE_URL}/admin/sites/${editingSite!.id}` : `${API_BASE_URL}/admin/sites`,
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nom: form.nom.trim(),
            code: form.code.trim().toUpperCase(),
            description: form.description.trim() || null,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data?.detail || "Impossible d'enregistrer l'agence");
        return;
      }
      await fetchSites();
      toast.success(isEdit ? 'Agence modifiée avec succès' : 'Agence ajoutée avec succès');
      setDialogOpen(false);
    } catch {
      toast.error("Impossible de joindre le backend");
    }
  };

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      toast.error('Session expirée. Reconnectez-vous.');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/admin/sites/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data?.detail || 'Suppression impossible');
        return;
      }
      await fetchSites();
      toast.success('Agence supprimée');
    } catch {
      toast.error("Impossible de joindre le backend");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des Agences</h1>
          <p className="text-muted-foreground">Configurer les agences et centres de colonie</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />Import Excel
          </Button>
          <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Ajouter une agence</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" />Agences configurées</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map(site => (
                <TableRow key={site.id}>
                  <TableCell><code className="text-xs bg-muted px-2 py-1 rounded font-semibold">{site.code}</code></TableCell>
                  <TableCell className="font-semibold">{site.nom}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{site.description || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(site)}><Pencil className="w-3 h-3" /></Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(site.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sites.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucune agence configurée</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSite ? "Modifier l'agence" : 'Ajouter une agence'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom <span className="text-destructive">*</span></Label>
              <Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: VDN, ZIGUINCHOR, MBOUR" />
            </div>
            <div>
              <Label>Code <span className="text-destructive">*</span></Label>
              <Input value={form.code} onChange={e => handleCodeChange(e.target.value)} placeholder="Ex: VDN, ZIG, MBR (majuscules, sans espace)" />
              {codeError && <p className="text-destructive text-sm mt-1">{codeError}</p>}
              {!codeError && form.code && <p className="text-muted-foreground text-xs mt-1">Majuscules uniquement, sans espace</p>}
            </div>
            <div>
              <Label>Description <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description de l'agence" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={!!codeError}>{editingSite ? 'Modifier' : 'Ajouter'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportExcel
        open={importOpen}
        onOpenChange={setImportOpen}
        singleEntity
        entities={[{
          value: 'sites',
          config: { label: 'Agences', colonnes: ['nom', 'code', 'description'], description: 'Colonnes requises : nom, code (majuscules, sans espace). Optionnelle : description.' },
          onImport: handleImportSites,
        }]}
      />
    </div>
  );
}
