import { Link } from 'react-router-dom';
import { Home, Search, RotateCcw, FileText, Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
            <Search className="h-10 w-10 text-foreground-muted" />
          </div>
          <h1 className="text-heading-1 font-heading font-semibold mb-2">Страница не найдена</h1>
          <p className="text-foreground-muted text-lg">
            Извините, мы не смогли найти страницу, которую вы ищете. Возможно, она была перемещена, удалена или никогда не существовала.
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={() => window.location.href = '/workspace'} className="w-full justify-center gap-2">
            <Home className="h-4 w-4" />
            Перейти в рабочее пространство
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/workspace/new'} className="w-full justify-center gap-2">
            <Plus className="h-4 w-4" />
            Создать новую страницу
          </Button>
          <Button variant="ghost" onClick={() => window.history.back()} className="w-full justify-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Назад
          </Button>
        </div>

        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-sm text-foreground-muted mb-4">Или попробуйте одно из следующего:</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link to="/workspace" className="text-sm text-accent hover:text-accent-hover">Все страницы</Link>
            <Link to="/workspace/favorites" className="text-sm text-accent hover:text-accent-hover">Избранное</Link>
            <Link to="/workspace/recent" className="text-sm text-accent hover:text-accent-hover">Недавние</Link>
            <Link to="/workspace/trash" className="text-sm text-accent hover:text-accent-hover">Корзина</Link>
            <Link to="/workspace/tags" className="text-sm text-accent hover:text-accent-hover">Теги</Link>
            <Link to="/settings" className="text-sm text-accent hover:text-accent-hover">Настройки</Link>
          </div>
        </div>
      </div>
    </div>
  );
}