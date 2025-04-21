import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PlusIcon, MagnifyingGlassIcon, CalendarIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { PilgrimModal } from '../components/PilgrimModal'

interface PilgrimGroup {
  id: number;
  nationality: string;
  count: number;
  status: 'registered' | 'arrived' | 'completed';
  center_id?: number;
  stage_id?: number;
  created_at: string;
}

export function Pilgrims() {
  const [groups, setGroups] = useState<PilgrimGroup[]>([]);
  const [totalPilgrims, setTotalPilgrims] = useState(0);
  const [, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editGroup, setEditGroup] = useState<PilgrimGroup | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('count-desc');

  async function fetchGroups() {
    try {
      const { data, error } = await supabase
        .from('pilgrim_groups')
        .select(`
          *,
          center:centers(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setGroups(data || []);
      setTotalPilgrims(data?.reduce((sum, group) => sum + group.count, 0) || 0);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGroups();
  }, []);

  async function handleDeleteGroup(id: number, nationality: string) {
    if (!window.confirm(`هل أنت متأكد من حذف مجموعة ${nationality}؟`)) return;

    try {
      const { error } = await supabase
        .from('pilgrim_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('حدث خطأ أثناء الحذف');
    }
  }

  const getRandomColor = (nationality: string) => {
    const colors = [
      'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
      'bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-400',
      'bg-purple-50 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400',
      'bg-pink-50 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400',
      'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400',
      'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400'
    ];
    
    const sum = nationality.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[sum % colors.length];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">إحصائيات الحجاج</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">إجمالي عدد الحجاج المسجلين</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 dark:text-primary-400">
                {totalPilgrims.toLocaleString('ar-SA')}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">حاج</div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              إضافة مجموعة
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 mb-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-700">
          <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">عدد المجموعات</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {groups.length.toLocaleString('ar-SA')}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="بحث حسب الجنسية..."
              className="input w-full pr-10 pl-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <MagnifyingGlassIcon 
              className="h-5 w-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" 
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>ترتيب حسب:</span>
            <select 
              className="input w-full sm:w-48 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                const sorted = [...groups].sort((a, b) => {
                  if (e.target.value === 'count-desc') return b.count - a.count;
                  if (e.target.value === 'count-asc') return a.count - b.count;
                  if (e.target.value === 'nationality-asc') return a.nationality.localeCompare(b.nationality, 'ar');
                  return b.nationality.localeCompare(a.nationality, 'ar');
                });
                setGroups(sorted);
              }}
            >
              <option value="count-desc">الأكبر عدداً</option>
              <option value="count-asc">الأقل عدداً</option>
              <option value="nationality-asc">الجنسية (أ-ي)</option>
              <option value="nationality-desc">الجنسية (ي-أ)</option>
            </select>
          </div>
        </div>

        {searchTerm && (
          <div className="mt-2 text-sm text-gray-500">
            نتائج البحث: {groups.filter(group => 
              group.nationality.toLowerCase().includes(searchTerm.toLowerCase())
            ).length} مجموعة
          </div>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {groups
          .filter(group => 
            group.nationality.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map(group => (
            <div 
              key={group.id} 
              className={`${getRandomColor(group.nationality)} rounded-lg shadow-sm p-6 hover:shadow-md transition-all duration-300 border border-gray-100 dark:border-gray-700`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">
                    {group.nationality}
                  </h3>
                  <div className="flex items-center text-sm opacity-75">
                    <CalendarIcon className="h-4 w-4 ml-1" />
                    {new Date(group.created_at).toLocaleDateString('ar-SA')}
                  </div>
                </div>
                <div className="text-center bg-white/50 dark:bg-black/10 backdrop-blur-sm rounded-lg p-3">
                  <div className="text-3xl font-bold mb-1">
                    {group.count.toLocaleString('ar-SA')}
                  </div>
                  <div className="text-xs">حاج</div>
                </div>
              </div>

              <div className="mt-4 flex items-center">
                <span className={`px-3 py-1 rounded-full text-sm
                  ${group.status === 'registered' ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400' : ''}
                  ${group.status === 'arrived' ? 'bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-400' : ''}
                  ${group.status === 'completed' ? 'bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-400' : ''}
                `}>
                  {group.status === 'registered' && 'مسجل'}
                  {group.status === 'arrived' && 'وصل'}
                  {group.status === 'completed' && 'مكتمل'}
                </span>
              </div>
              
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button 
                  onClick={() => {
                    setEditGroup(group);
                    setShowModal(true);
                  }} 
                  className="flex items-center px-3 py-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/50 rounded-md transition-colors duration-200"
                >
                  <PencilIcon className="h-4 w-4 ml-1" />
                  تعديل
                </button>
                <button 
                  onClick={() => handleDeleteGroup(group.id, group.nationality)}
                  className="flex items-center px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-md transition-colors duration-200"
                >
                  <TrashIcon className="h-4 w-4 ml-1" />
                  حذف
                </button>
              </div>
            </div>
          ))}
      </div>

      <PilgrimModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditGroup(undefined);
        }}
        onSuccess={fetchGroups}
        editGroup={editGroup}
      />
    </div>
  );
}