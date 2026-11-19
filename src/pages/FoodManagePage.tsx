import { useState } from 'react';
import { Plus, X, Save, Trash2, UtensilsCrossed, Clock } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import FeatureGate from '../components/FeatureGate';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { useAppStore } from '../store/appStore';
import type { FoodMenuItem, MealType } from '../types';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const MEALS: MealType[] = ['Breakfast', 'Lunch', 'Dinner'];
const DEFAULT_TIMING: Record<MealType, string> = { Breakfast: '7:30 AM – 9:30 AM', Lunch: '12:30 PM – 2:30 PM', Dinner: '8:00 PM – 10:00 PM' };

type Draft = { items: string[]; timing: string; adding: string };

/** Weekly menu editor for owners and managers (food permission). Add, edit and remove items per meal. */
export default function FoodManagePage({ role }: { role: 'owner' | 'manager' }) {
  const { data, saveMenuItem, deleteMenuItem } = useAppStore();
  const toast = useToast();
  const [day, setDay] = useState<(typeof DAYS)[number]>(DAYS[(new Date().getDay() + 6) % 7]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [toRemove, setToRemove] = useState<FoodMenuItem | null>(null);

  const saved = (meal: MealType) => data.foodMenu.find((m) => m.day === day && m.mealType === meal);
  const key = (meal: MealType) => `${day}-${meal}`;
  const draftOf = (meal: MealType): Draft => drafts[key(meal)] ?? { items: saved(meal)?.items ?? [], timing: saved(meal)?.timing ?? DEFAULT_TIMING[meal], adding: '' };
  const setDraft = (meal: MealType, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [key(meal)]: { ...draftOf(meal), ...patch } }));
  const dirty = (meal: MealType) => {
    const d = drafts[key(meal)];
    const s = saved(meal);
    return !!d && (d.items.join('|') !== (s?.items ?? []).join('|') || d.timing !== (s?.timing ?? DEFAULT_TIMING[meal]));
  };

  const addItem = (meal: MealType) => {
    const d = draftOf(meal);
    const v = d.adding.trim();
    if (!v) return;
    if (d.items.some((i) => i.toLowerCase() === v.toLowerCase())) return setDraft(meal, { adding: '' });
    setDraft(meal, { items: [...d.items, v], adding: '' });
  };

  const save = async (meal: MealType) => {
    const d = draftOf(meal);
    if (d.items.length === 0) return toast.show('Add at least one item, or remove the meal', 'error');
    setBusy(key(meal));
    const res = await saveMenuItem({ day, mealType: meal, items: d.items, timing: d.timing.trim() });
    setBusy(null);
    if (res.ok) { setDrafts(({ [key(meal)]: _drop, ...rest }) => rest); toast.show(`${day} ${meal.toLowerCase()} saved`, 'success'); } else toast.show(res.error, 'error');
  };

  const remove = async () => {
    if (!toRemove) return;
    const res = await deleteMenuItem(toRemove.id);
    setToRemove(null);
    if (res.ok) { setDrafts(({ [`${toRemove.day}-${toRemove.mealType}`]: _drop, ...rest }) => rest); toast.show('Meal removed from the menu', 'success'); } else toast.show(res.error, 'error');
  };

  return (
    <FeatureGate role={role} feature="food" permission="food" title="Food Menu">
      <AppLayout role={role} title="Food Menu" subtitle="Plan the weekly mess menu. Tenants see changes straight away.">
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-5" role="tablist" aria-label="Day of week">
          {DAYS.map((d) => {
            const filled = MEALS.filter((m) => data.foodMenu.some((x) => x.day === d && x.mealType === m)).length;
            return (
              <button key={d} role="tab" aria-selected={day === d} onClick={() => setDay(d)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap border transition ${day === d ? 'bg-primary text-white border-primary' : 'bg-white text-dark-600 border-dark-200 hover:bg-dark-50'}`}>
                {d.slice(0, 3)} <span className={`ml-1 text-xs ${day === d ? 'text-white/70' : 'text-dark-400'}`}>{filled}/3</span>
              </button>
            );
          })}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {MEALS.map((meal) => {
            const d = draftOf(meal);
            const existing = saved(meal);
            return (
              <section key={meal} className="card p-5 flex flex-col" aria-label={`${day} ${meal}`}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-dark-900 flex items-center gap-2"><UtensilsCrossed size={16} className="text-primary" /> {meal}</h3>
                  {existing && <button className="btn-ghost !px-2 text-error hover:!bg-error-light" aria-label={`Remove ${day} ${meal} from the menu`} onClick={() => setToRemove(existing)}><Trash2 size={15} /></button>}
                </div>
                <label className="text-xs text-dark-500 flex items-center gap-1.5 mb-3"><Clock size={12} /> Timing
                  <input className="input-field !py-1.5 !text-xs" value={d.timing} maxLength={50} onChange={(e) => setDraft(meal, { timing: e.target.value })} aria-label={`${meal} timing`} />
                </label>
                <ul className="flex flex-wrap gap-1.5 mb-3 min-h-[2rem]">
                  {d.items.length === 0 && <li className="text-sm text-dark-400">No items yet</li>}
                  {d.items.map((item) => (
                    <li key={item} className="inline-flex items-center gap-1 bg-primary-50 text-primary-800 rounded-full pl-3 pr-1.5 py-1 text-sm">
                      {item}
                      <button aria-label={`Remove ${item}`} className="p-0.5 rounded-full hover:bg-primary-100" onClick={() => setDraft(meal, { items: d.items.filter((i) => i !== item) })}><X size={13} /></button>
                    </li>
                  ))}
                </ul>
                <form className="flex gap-2 mt-auto" onSubmit={(e) => { e.preventDefault(); addItem(meal); }}>
                  <input className="input-field !py-2" placeholder="Add item…" maxLength={60} value={d.adding} onChange={(e) => setDraft(meal, { adding: e.target.value })} aria-label={`Add item to ${meal}`} />
                  <button type="submit" className="btn-secondary !px-3" aria-label="Add item"><Plus size={16} /></button>
                </form>
                <button className="btn-primary mt-3" disabled={!dirty(meal) || busy === key(meal)} onClick={() => save(meal)}><Save size={15} /> {busy === key(meal) ? 'Saving…' : existing ? 'Save changes' : 'Save meal'}</button>
              </section>
            );
          })}
        </div>

        <ConfirmDialog open={!!toRemove} danger title="Remove this meal?" confirmLabel="Remove" message={<>{toRemove?.day} {toRemove?.mealType?.toLowerCase()} will disappear from the tenants’ menu.</>} onConfirm={remove} onCancel={() => setToRemove(null)} />
      </AppLayout>
    </FeatureGate>
  );
}
