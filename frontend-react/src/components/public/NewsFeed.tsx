import React from 'react';
import type { NewsNotification } from '../../services/newsApi';
import { Calendar, MapPin, ExternalLink, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NewsFeedProps {
  news: NewsNotification[];
  isLoading: boolean;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ news, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/50 animate-pulse rounded-xl p-6 h-32 border border-slate-200" />
        ))}
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-4">
        <Info size={48} className="text-slate-300" />
        <p className="text-lg font-medium">Nenhuma notificação encontrada no momento.</p>
        <p className="text-sm">Tente ajustar seus filtros ou volte mais tarde.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {news.map((item) => (
        <div 
          key={item.id} 
          className="group relative bg-white hover:bg-slate-50 transition-all duration-300 rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md overflow-hidden"
        >
          {/* Severity Indicator Bar (Optional - could be based on category) */}
          <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
            item.category === 'Disaster' ? 'bg-rose-500' : 
            item.category === 'Weather' ? 'bg-amber-500' : 'bg-blue-500'
          }`} />

          <div className="pl-2 space-y-3">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                {item.title}
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {item.source}
              </span>
            </div>

            <p className="text-slate-600 line-clamp-2 text-sm leading-relaxed">
              {item.content}
            </p>

            <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-slate-400" />
                <span>{item.location}, {item.country}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-slate-400" />
                <span>{format(new Date(item.publishedAt), "PPp", { locale: ptBR })}</span>
              </div>
              
              {item.externalUrl && (
                <a 
                  href={item.externalUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-blue-600 hover:underline"
                >
                  Ver fonte original
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
