import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, User, Phone, MapPin, X } from 'lucide-react';
import type { Shop } from '@/types';
import { cityLabel } from '@/lib/geo';
import { formatAed } from '@/lib/format';

interface SearchableCustomerSelectProps {
  label?: string;
  shops: Shop[];
  selectedShopId: string;
  onSelectShop: (shopId: string) => void;
  shopBalance?: (shopId: string) => number;
  error?: string;
  required?: boolean;
}

export function SearchableCustomerSelect({
  label = 'العميل / المحل',
  shops,
  selectedShopId,
  onSelectShop,
  shopBalance,
  error,
  required = true,
}: SearchableCustomerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedShop = useMemo(() => {
    return shops.find((s) => s.id === selectedShopId) || null;
  }, [shops, selectedShopId]);

  // Filter shops based on search query
  const filteredShops = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter((s) => {
      const matchName = s.name.toLowerCase().includes(q);
      const matchOwner = s.ownerName?.toLowerCase().includes(q);
      const matchPhone = s.phone?.toLowerCase().includes(q);
      const matchCity = cityLabel(s.city).toLowerCase().includes(q) || s.city?.toLowerCase().includes(q);
      const matchArea = s.area?.toLowerCase().includes(q);
      return matchName || matchOwner || matchPhone || matchCity || matchArea;
    });
  }, [shops, query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (shop: Shop) => {
    onSelectShop(shop.id);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectShop('');
    setQuery('');
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="space-y-1.5 text-right relative" ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-secondary-700">
            {label} {required && <span className="text-error-500">*</span>}
          </label>
          {selectedShop && (
            <span className="text-[11px] text-primary-600 font-medium">
              تم اختيار العميل
            </span>
          )}
        </div>
      )}

      {/* Main trigger / Search input box */}
      <div className="relative">
        <div
          onClick={() => {
            setIsOpen(true);
            inputRef.current?.focus();
          }}
          className={`w-full min-h-[42px] rounded-xl bg-white border px-3 py-2 text-sm text-secondary-900 transition-all cursor-text flex items-center gap-2 ${
            isOpen ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-secondary-200 hover:border-secondary-300'
          } ${error ? 'border-error-500 ring-2 ring-error-500/20' : ''}`}
        >
          <Search className="w-4 h-4 text-secondary-400 shrink-0" />
          
          <input
            ref={inputRef}
            type="text"
            value={isOpen ? query : (selectedShop ? selectedShop.name : '')}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              setIsOpen(true);
              setQuery('');
            }}
            placeholder={selectedShop ? selectedShop.name : 'ابحث بكتابة اسم العميل، الهاتف، أو المدينة...'}
            className="w-full bg-transparent border-0 p-0 text-sm text-secondary-900 placeholder:text-secondary-400 focus:outline-none focus:ring-0 text-right"
          />

          <div className="flex items-center gap-1 shrink-0">
            {selectedShop && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-secondary-100 rounded-lg text-secondary-400 hover:text-secondary-600 transition-colors"
                title="إلغاء الاختيار"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
                if (!isOpen) inputRef.current?.focus();
              }}
              className="p-1 hover:bg-secondary-100 rounded-lg text-secondary-400 hover:text-secondary-600 transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-primary-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Selected preview chip if not open */}
        {selectedShop && !isOpen && (
          <div className="mt-1.5 flex items-center justify-between text-[11px] bg-secondary-50 px-2.5 py-1.5 rounded-lg border border-secondary-100 text-secondary-600">
            <span className="flex items-center gap-1 truncate">
              <User className="w-3 h-3 text-secondary-400" />
              {selectedShop.ownerName || 'بدون اسم مسؤول'}
              {selectedShop.phone && (
                <span className="text-secondary-400 font-mono flex items-center gap-0.5 mr-1.5">
                  <Phone className="w-2.5 h-2.5" />
                  {selectedShop.phone}
                </span>
              )}
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <MapPin className="w-3 h-3 text-secondary-400" />
              {cityLabel(selectedShop.city)}
              {shopBalance && (
                <span className={`font-bold mr-1.5 tabular-nums ${shopBalance(selectedShop.id) > 0 ? 'text-error-600' : 'text-success-600'}`}>
                  (رصيد: {formatAed(shopBalance(selectedShop.id))})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 right-0 left-0 top-full mt-1.5 bg-white rounded-xl shadow-xl ring-1 ring-secondary-200 overflow-hidden divide-y divide-secondary-100 max-h-64 overflow-y-auto scrollbar-thin animate-in fade-in zoom-in-95 duration-100">
            {filteredShops.length === 0 ? (
              <div className="p-4 text-center text-xs text-secondary-500">
                <p className="font-semibold text-secondary-700 mb-1">لا يوجد عميل يطابق البحث &ldquo;{query}&rdquo;</p>
                <p className="text-secondary-400">تأكد من كتابة الاسم أو رقم الهاتف بشكل صحيح</p>
              </div>
            ) : (
              filteredShops.map((shop) => {
                const isSelected = shop.id === selectedShopId;
                const balance = shopBalance ? shopBalance(shop.id) : 0;
                return (
                  <button
                    key={shop.id}
                    type="button"
                    onClick={() => handleSelect(shop)}
                    className={`w-full text-right px-3.5 py-2.5 hover:bg-primary-50 transition-colors flex items-center justify-between gap-2.5 ${
                      isSelected ? 'bg-primary-50/80 font-medium' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold truncate ${isSelected ? 'text-primary-700' : 'text-secondary-900'}`}>
                          {shop.name}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-primary-600 shrink-0" />}
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-secondary-500 mt-0.5 flex-wrap">
                        {shop.ownerName && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-secondary-400" />
                            {shop.ownerName}
                          </span>
                        )}
                        {shop.phone && (
                          <span className="flex items-center gap-1 font-mono text-secondary-600">
                            <Phone className="w-3 h-3 text-secondary-400" />
                            {shop.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-secondary-500">
                          <MapPin className="w-3 h-3 text-secondary-400" />
                          {cityLabel(shop.city)} {shop.area ? `- ${shop.area}` : ''}
                        </span>
                      </div>
                    </div>

                    {shopBalance && (
                      <div className="text-left shrink-0">
                        <span className="text-[10px] text-secondary-400 block">الرصيد / الدين</span>
                        <span className={`text-xs font-bold tabular-nums ${balance > 0 ? 'text-error-600' : 'text-secondary-600'}`}>
                          {formatAed(balance)}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-error-600 font-medium">{error}</p>}
    </div>
  );
}
