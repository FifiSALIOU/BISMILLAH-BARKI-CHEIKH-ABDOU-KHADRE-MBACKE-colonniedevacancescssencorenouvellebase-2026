import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, List, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import ImportExcel from './ImportExcel';

const CODE_OPTIONS = [
  { value: 'PRINCIPALE', label: 'PRINCIPALE' },
  { value: 'ATTENTE_N1', label: 'ATTENTE_N1' },
  { value: 'ATTENTE_N2', label: 'ATTENTE_N2' },
];

interface ListeConfig {
  id: string;
  code: string;
  nom: string;
  description: string;
}

export default function GestionListesConfig() {
  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://127.0.0.1:8000';
  const [listes, setListes] = useState<ListeConfig[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingListe, setEditingListe] = useState<ListeConfig | null>(null);
  const [form, setForm] = useState({ code: '', nom: '', description: '' });
  const [importOpen, setImportOpen] = useState(false);

  const fetchListes = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    const response = await fetch(`${API_BASE_URL}/admin/listes-config`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const data = await response.json();
    if (!Array.isArray(data)) return;
    setListes(
      data.map((l) => ({
        id: String(l.id),
        code: String(l.code),
        nom: String(l.nom),
        description: l.description ? String(l.description) : '',
      })),
    );
  };

  useEffect(() => {
    void fetchListes();
  }, []);

  const handleImportListes = async (data: any[]) => {
    let success = 0;
    const errors: { ligne: number; message: string }[] = [];
    const validCodes = CODE_OPTIONS.map(o => o.value);
    const token = localStorage.getItem('access_token');
    if (!token) {
      return { success: 0, errors: [{ ligne: 1, message: 'Session expirée. Reconnectez-vous.' }] };
    }
    for (let i = 0; i < data.length; i += 1) {
      const row = data[i];
      if (!row.code || !row.nom) { errors.push({ ligne: i + 2, message: 'Champs obligatoires manquants (code, nom)' }); continue; }
      const code = row.code.toUpperCase().trim();
      if (!validCodes.includes(code)) { errors.push({ ligne: i + 2, message: `Code invalide "${row.code}" (${validCodes.join(', ')})` }); continue; }
      try {
        const response = await fetch(`${API_BASE_URL}/admin/listes-config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code, nom: row.nom, description: row.description || null }),
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
    await fetchListes();
    return { success, errors };
  };

  const usedCodes = listes.filter(l => l.id !== editingListe?.id).map(l => l.code);
  const availableCodes = CODE_OPTIONS.filter(o => !usedCodes.includes(o.value));

  const openAdd = () => {
    setEditingListe(null);
    setForm({ code: '', nom: '', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (liste: ListeConfig) => {
    setEditingListe(liste);
    setForm({ code: liste.code, nom: liste.nom, description: liste.description });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.nom.trim()) {
      toast.error('Le code et le nom sont obligatoires');
      return;
    }
    const isDuplicate = listes.some(l => l.code === form.code && l.id !== editingListe?.id);
    if (isDuplicate) {
      toast.error('Ce code de liste existe déjà, veuillez en choisir un autre');
      return;
    }
    const token = localStorage.getItem('access_token');
    if (!token) {
      toast.error('Session expirée. Reconnectez-vous.');
      return;
    }
    try {
      const isEdit = !!editingListe;
      const response = await fetch(
        isEdit ? `${API_BASE_URL}/admin/listes-config/${editingListe!.id}` : `${API_BASE_URL}/admin/listes-config`,
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            code: form.code,
            nom: form.nom.trim(),
            description: form.description.trim() || null,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data?.detail || "Impossible d'enregistrer");
        return;
      }
      await fetchListes();
      toast.success(isEdit ? 'Liste modifiée avec succès' : 'Liste ajoutée avec succès');
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
      const response = await fetch(`${API_BASE_URL}/admin/listes-config/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data?.detail || 'Suppression impossible');
        return;
      }
      await fetchListes();
      toast.success('Liste supprimée');
    } catch {
      toast.error("Impossible de joindre le backend");
    }
  };

  // For edit, include current code in available options
  const selectableCodes = editingListe
    ? CODE_OPTIONS.filter(o => !usedCodes.includes(o.value) || o.value === editingListe.code)
    : availableCodes;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des Listes</h1>
          <p className="text-muted-foreground">Configurer les listes d'inscription</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />Import Excel
          </Button>
          <Button onClick={openAdd} disabled={availableCodes.length === 0}>
            <Plus className="w-4 h-4 mr-2" />Ajouter une liste
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><List className="w-5 h-5" />Listes configurées</CardTitle></CardHeader>
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
              {listes.map(liste => (
                <TableRow key={liste.id}>
                  <TableCell><code className="text-xs bg-muted px-2 py-1 rounded font-semibold">{liste.code}</code></TableCell>
                  <TableCell className="font-semibold">{liste.nom}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{liste.description || '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(liste)}><Pencil className="w-3 h-3" /></Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(liste.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {listes.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucune liste configurée</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingListe ? 'Modifier la liste' : 'Ajouter une liste'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Code <span className="text-destructive">*</span></Label>
              <Select value={form.code} onValueChange={v => setForm(f => ({ ...f, code: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un code" /></SelectTrigger>
                <SelectContent>
                  {selectableCodes.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nom <span className="text-destructive">*</span></Label>
              <Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: Liste principale" />
            </div>
            <div>
              <Label>Description <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description de la liste" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave}>{editingListe ? 'Modifier' : 'Ajouter'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportExcel
        open={importOpen}
        onOpenChange={setImportOpen}
        singleEntity
        entities={[{
          value: 'listes',
          config: { label: 'Listes', colonnes: ['code', 'nom', 'description'], description: 'Colonnes requises : code (PRINCIPALE, ATTENTE_N1, ATTENTE_N2), nom. Optionnelle : description.' },
          onImport: handleImportListes,
        }]}
      />
    </div>
  );
}
