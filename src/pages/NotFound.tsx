import { Link } from 'react-router-dom';
import { useT } from '../lib/i18n';

export default function NotFound() {
  const t = useT();
  return (
    <div className="card mx-auto max-w-md text-center">
      <h1 className="text-2xl font-bold">404</h1>
      <p className="mt-1">{t('notFound')}</p>
      <Link to="/" className="btn btn-primary mt-4">{t('home')}</Link>
    </div>
  );
}
