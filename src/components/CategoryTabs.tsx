import React from 'react';
import {
  Globe,
  Image as ImageIcon,
  Video as VideoIcon,
  Newspaper,
  GraduationCap,
  Music,
  MapPin,
} from 'lucide-react';
import { SearchCategory } from '../types.js';

interface CategoryTabsProps {
  activeCategory: SearchCategory;
  onSelectCategory: (category: SearchCategory) => void;
  resultCounts?: Record<SearchCategory, number>;
}

const CATEGORIES: { id: SearchCategory; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'all', label: 'All', icon: Globe },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'videos', label: 'Videos', icon: VideoIcon },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'science', label: 'Science', icon: GraduationCap },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'maps', label: 'Maps', icon: MapPin },
];

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  activeCategory,
  onSelectCategory,
}) => {
  return (
    <div
      id="category-tabs-container"
      className="w-full max-w-4xl mx-auto overflow-x-auto no-scrollbar py-2 px-1"
    >
      <div className="flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 min-w-max">
        {CATEGORIES.map(({ id, label, icon: Icon }) => {
          const isActive = activeCategory === id;
          return (
            <button
              key={id}
              id={`tab-category-${id}`}
              onClick={() => onSelectCategory(id)}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all select-none cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-500 font-semibold'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800/80'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
