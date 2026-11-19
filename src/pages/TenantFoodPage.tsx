import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { UtensilsCrossed, Clock, CalendarDays, Star, Undo2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useToast } from '../components/Toast';
import { formatDate, todayISO } from '../utils/format';
import type { MealType } from '../types';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

const mealAccent: Record<MealType, string> = {
  Breakfast: 'bg-warning text-white',
  Lunch: 'bg-success text-white',
  Dinner: 'bg-secondary text-white',
};

export default function TenantFoodPage() {
  const { data, addMealOptOut, removeMealOptOut, rateMeal } = useAppStore();
  const toast = useToast();

  const tenant = data.tenants.find((t) => t.id === data.activeTenantId);
  const [selectedDate, setSelectedDate] = useState(todayISO());

  if (!tenant) {
    return (
      <AppLayout role="tenant" title="Food Menu">
        <div className="card p-10 text-center text-dark-500">Tenant profile not found. Please log in again.</div>
      </AppLayout>
    );
  }

  const currentDayName = days[(new Date(selectedDate + 'T00:00:00').getDay() + 6) % 7];
  const dayMenu = data.foodMenu.filter((item) => item.day === currentDayName);

  const isOptedOut = (mealType: MealType) =>
    data.mealOptOuts.some((o) => o.tenantId === tenant.id && o.date === selectedDate && o.mealType === mealType);

  const toggleOptOut = (mealType: MealType) => {
    if (isOptedOut(mealType)) {
      removeMealOptOut(selectedDate, mealType);
      toast.show(`${mealType} opt-out removed — meal restored.`, 'info');
    } else {
      addMealOptOut(selectedDate, mealType);
      toast.show(`${mealType} skipped for ${formatDate(selectedDate)}.`, 'info');
    }
  };

  const ratingFor = (mealType: MealType) =>
    data.foodRatings.find((r) => r.tenantId === tenant.id && r.date === selectedDate && r.mealType === mealType)?.rating ?? 0;

  const selectDay = (dayIndex: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    const currentIdx = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() + (dayIndex - currentIdx));
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <AppLayout role="tenant" title="Food Menu" subtitle={formatDate(selectedDate)}>
      <div className="space-y-6">
        {/* Menu Header */}
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-dark-900 flex items-center gap-2">
              <UtensilsCrossed size={20} className="text-warning" />
              Weekly Food Menu
            </h2>
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-primary" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-background-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Day Selection */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {days.map((day, idx) => (
              <button
                key={day}
                onClick={() => selectDay(idx)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  currentDayName === day
                    ? 'bg-primary text-white'
                    : 'bg-background-200 text-dark-700 hover:bg-background-300'
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>

          {/* Daily Menu */}
          <div className="mt-6 space-y-6">
            {(['Breakfast', 'Lunch', 'Dinner'] as MealType[]).map((mealType) => {
              const item = dayMenu.find((m) => m.mealType === mealType);
              if (!item) return null;
              const opted = isOptedOut(mealType);
              const rating = ratingFor(mealType);
              return (
                <div key={item.id} className={`border rounded-xl p-5 transition-colors ${opted ? 'border-background-300 bg-background-200 opacity-80' : 'border-background-300'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mealAccent[mealType]}`}>
                        <UtensilsCrossed size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-dark-900">{item.mealType}</div>
                        <div className="text-xs text-dark-400 flex items-center gap-1">
                          <Clock size={12} /> {item.timing}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleOptOut(mealType)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        opted
                          ? 'bg-background-300 text-dark-600 hover:bg-warning-light'
                          : 'bg-error-light text-error hover:bg-error/20'
                      }`}
                    >
                      {opted ? (
                        <>
                          <Undo2 size={14} /> Opt Back In
                        </>
                      ) : (
                        "I don't need today's food"
                      )}
                    </button>
                  </div>

                  <div className="bg-background-200 rounded-lg p-4">
                    <div className="font-medium text-dark-900 mb-2 text-sm">Menu:</div>
                    <div className="flex flex-wrap gap-2">
                      {item.items.map((food, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-sm text-dark-600 bg-white border border-background-300 px-3 py-1.5 rounded-full">
                          <span className="text-primary">•</span> {food}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="mt-4 pt-3 border-t border-background-200 flex items-center justify-between">
                    <span className="text-sm text-dark-500">
                      {rating > 0 ? `You rated this meal ${rating}/5` : 'Rate this meal:'}
                    </span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => {
                            rateMeal(selectedDate, mealType, star);
                            toast.show(`Thanks for rating ${mealType} ${star}/5!`, 'success');
                          }}
                          className="transition-transform hover:scale-110"
                          aria-label={`Rate ${star} star`}
                        >
                          <Star
                            size={22}
                            className={star <= rating ? 'text-warning fill-warning' : 'text-dark-200'}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Food Policy */}
        <div className="card p-6">
          <h3 className="font-bold text-lg text-dark-900 mb-3">Food Policy</h3>
          <ul className="space-y-2 text-sm text-dark-600">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Opt out before 8:00 AM on the day of the meal
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Skipped meals help the kitchen plan better — thank you for letting us know.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              The weekly menu is updated every Sunday for the coming week
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Rate meals to help improve food quality
            </li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}
