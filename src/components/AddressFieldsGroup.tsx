import React, { useMemo, useState } from 'react';
import { MapPin, Navigation, Home, Building2 } from 'lucide-react';
import { DeliveryCityConfig } from '../types';
import { normalizeTextKey } from '../utils/locationCategoryHelpers';

interface AddressFieldsGroupProps {
  cities: DeliveryCityConfig[];
  city: string;
  area?: string;
  mohalla?: string;
  landmark?: string;
  address?: string;
  onChange: (patch: {
    city?: string;
    area?: string;
    mohalla?: string;
    landmark?: string;
    address?: string;
  }) => void;
  filterActiveCitiesOnly?: boolean;
  showCompleteAddress?: boolean;
  required?: boolean;
  compact?: boolean;
}

export const AddressFieldsGroup: React.FC<AddressFieldsGroupProps> = ({
  cities,
  city,
  area = '',
  mohalla = '',
  landmark = '',
  address = '',
  onChange,
  filterActiveCitiesOnly = true,
  showCompleteAddress = true,
  required = false,
  compact = false,
}) => {
  const [customAreaMode, setCustomAreaMode] = useState(false);

  const visibleCities = useMemo(() => {
    const base = filterActiveCitiesOnly ? cities.filter((c) => c.allowed) : cities;
    if (city && !base.some((c) => normalizeTextKey(c.name) === normalizeTextKey(city))) {
      return [...base, { id: `legacy_${city}`, name: city, allowed: true, areas: [] }];
    }
    return base;
  }, [cities, city, filterActiveCitiesOnly]);

  const selectedCityObj = useMemo(
    () => cities.find((c) => normalizeTextKey(c.name) === normalizeTextKey(city)),
    [cities, city]
  );

  const cityAreas = useMemo(() => {
    const list = (selectedCityObj?.areas || []).filter((a) =>
      filterActiveCitiesOnly ? a.allowed : true
    );
    return list;
  }, [selectedCityObj, filterActiveCitiesOnly]);

  const hasMatchingPredefinedArea = useMemo(
    () => Boolean(area && cityAreas.some((a) => normalizeTextKey(a.name) === normalizeTextKey(area))),
    [area, cityAreas]
  );

  const useManualArea = customAreaMode || (cityAreas.length === 0 && Boolean(city));

  const fieldCls =
    'w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-400';

  return (
    <div className={compact ? 'space-y-2.5' : 'space-y-3'}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* City Dropdown */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-amber-500" />
            <span>City / شہر {required && '*'}</span>
          </label>
          <select
            required={required}
            value={city}
            onChange={(e) => {
              const nextCity = e.target.value;
              const nextCityObj = cities.find(
                (c) => normalizeTextKey(c.name) === normalizeTextKey(nextCity)
              );
              const nextAreas = (nextCityObj?.areas || []).filter((a) =>
                filterActiveCitiesOnly ? a.allowed : true
              );
              setCustomAreaMode(false);
              onChange({
                city: nextCity,
                area: nextAreas[0]?.name || '',
              });
            }}
            className={fieldCls}
          >
            <option value="">-- Select City --</option>
            {visibleCities.map((c) => (
              <option key={c.id || c.name} value={c.name}>
                {c.name} {!c.allowed ? '(Delivery Disabled)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic Area Dropdown */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
              <span>Area Name / علاقہ</span>
            </label>
            {cityAreas.length > 0 && (
              <button
                type="button"
                onClick={() => setCustomAreaMode(!customAreaMode)}
                className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                {customAreaMode ? 'Choose from list' : 'Other area'}
              </button>
            )}
          </div>

          {!useManualArea ? (
            <select
              value={area}
              onChange={(e) => {
                if (e.target.value === '__OTHER__') {
                  setCustomAreaMode(true);
                  onChange({ area: '' });
                } else {
                  onChange({ area: e.target.value });
                }
              }}
              className={fieldCls}
            >
              <option value="">-- Select Area in {city || 'City'} --</option>
              {cityAreas.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
              {area && !hasMatchingPredefinedArea && (
                <option value={area}>{area} (Saved)</option>
              )}
              <option value="__OTHER__">+ Type Area Manually</option>
            </select>
          ) : (
            <input
              type="text"
              value={area}
              onChange={(e) => onChange({ area: e.target.value })}
              placeholder={city ? `Enter area in ${city}` : 'Enter area name'}
              className={fieldCls}
            />
          )}
        </div>
      </div>

      {/* Mohalla & Nearby Landmark */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
            <Home className="w-3.5 h-3.5 text-amber-500" />
            <span>Mohalla / Neighborhood (محلہ / کالونی)</span>
          </label>
          <input
            type="text"
            value={mohalla}
            onChange={(e) => onChange({ mohalla: e.target.value })}
            placeholder="e.g. Mohalla Eidgah / Street 4 / Block B"
            className={fieldCls}
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5 text-amber-500" />
            <span>Nearby Landmark (قریبی مشہور جگہ)</span>
          </label>
          <input
            type="text"
            value={landmark}
            onChange={(e) => onChange({ landmark: e.target.value })}
            placeholder="e.g. Near Jamia Masjid / Main Gate"
            className={fieldCls}
          />
        </div>
      </div>

      {/* Complete Address */}
      {showCompleteAddress && (
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
            Complete Address / House &amp; Shop No. {required && '*'}
          </label>
          <input
            type="text"
            required={required}
            value={address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="House / Shop #, Road, Floor or Delivery Instructions"
            className={fieldCls}
          />
        </div>
      )}
    </div>
  );
};
