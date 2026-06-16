import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

export default function Forbidden() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-[#FAF8F5] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-100 shadow-sm p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Acces refuse</h1>
        <p className="mt-2 text-sm text-gray-600">
          Vous n&apos;avez pas les permissions necessaires pour acceder a cette page.
        </p>
        <Link
          to="/dashboard/personnel"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Accueil
        </Link>
      </div>
    </div>
  );
}
