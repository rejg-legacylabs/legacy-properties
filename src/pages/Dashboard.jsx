import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import useCurrentUser from '@/lib/useCurrentUser';
import PremiumPageHeader from '@/components/PremiumPageHeader';
import PremiumStatCard from '@/components/PremiumStatCard';
import HouseCard from '@/components/HouseCard';
import { Building2, BedDouble, Home, AlertTriangle } from 'lucide-react';
import RevenueSummaryWidget from '@/components/RevenueSummaryWidget';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isInternal } = useCurrentUser();
  const [properties, setProperties] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [occupancy, setOccupancy] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);
  const [moveRequests, setMoveRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        if (isInternal) {
          const [propsRes, refsRes, occRes, roomsRes, moveRes, bedsRes] = await Promise.all([
            base44.entities.Property.list(),
            base44.entities.HousingApplication.list(),
            base44.entities.OccupancyRecord.list(),
            base44.entities.Room.list(),
            base44.entities.MoveRequest.list(),
            base44.entities.Bed.list(),
          ]);
          setProperties(propsRes || []);
          setReferrals(refsRes || []);
          setOccupancy(occRes || []);
          setRooms(roomsRes || []);
          setMoveRequests(moveRes || []);
          setBeds(bedsRes || []);
        }
      } catch (error) {
        console.error('Dashboard load error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) loadDashboardData();
  }, [user, isInternal]);

  const perBedProps = properties.filter((p) => p.housing_model === 'per_bed');
  const turnkeyProps = properties.filter((p) => p.housing_model === 'turnkey_house');

  const totalBeds = properties.reduce((sum, p) => sum + (p.total_bed_count || 0), 0);
  const occupiedBeds = occupancy.filter((o) => o.occupancy_status === 'active').length;
  const availableBeds = totalBeds - occupiedBeds;
  const occupancyPercent = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const fullHouses = properties.filter((p) => p.total_bed_count && p.total_bed_count - (occupancy.filter((o) => o.property_id === p.id && o.occupancy_status === 'active').length) === 0).length;
  const nearCapacity = properties.filter((p) => {
    const occupied = occupancy.filter((o) => o.property_id === p.id && o.occupancy_status === 'active').length;
    const total = p.total_bed_count || 0;
    return total > 0 && (occupied / total) >= 0.8 && occupied < total;
  }).length;

  const pendingReferrals = referrals.filter((r) => r.application_status === 'under_review' || r.application_status === 'pending_documents').length;
  const totalRooms = rooms.filter(r => r.status === 'active').length;
  const pendingMoves = moveRequests.filter(r => r.request_status === 'submitted' || r.request_status === 'under_review' || r.request_status === 'approved').length;
  const needsCleaningCount = beds.filter(b => b.bed_status === 'needs_cleaning').length;

  const handleNavigate = (path, filters) => {
    sessionStorage.setItem('navigationFilters', JSON.stringify(filters));
    navigate(path);
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-card-border rounded-lg p-8 mb-8">
        <h1 className="text-4xl font-bold text-heading mb-2">Welcome to REJG Legacy Properties</h1>
        <p className="text-body-text mb-4">Today is {today}</p>
        <p className="text-muted-label">{properties.length} properties • {totalBeds} beds • 100% Drug & Alcohol Free • Real-time operations</p>
      </div>

      {/* Premium Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <PremiumStatCard title="Total Properties" value={properties.length} accentColor="indigo" icon={Building2} />
        <PremiumStatCard title="Total Beds" value={totalBeds} accentColor="primary" icon={BedDouble} />
        <PremiumStatCard title="Occupied Beds" value={occupiedBeds} accentColor="rose" icon={Home} />
        <PremiumStatCard title="Available Beds" value={availableBeds} accentColor="emerald" icon={AlertTriangle} />
      </div>

      <PremiumPageHeader
        title="Operations Overview"
        subtitle="REJG Legacy Properties — Monitor key metrics and property status"
      />

      {!isInternal ? (
        <div className="bg-elevated border border-card-border rounded-lg p-6 text-center">
          <p className="text-body-text">
            Partner dashboard view coming soon. Contact your account manager.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div onClick={() => handleNavigate('/properties', {})} className="bg-card border border-card-border rounded-lg p-4 shadow-sm hover:shadow-lg hover:border-primary transition-all cursor-pointer group">
              <div className="text-xs font-semibold text-muted-label uppercase tracking-wider mb-1">Houses</div>
              <div className="text-2xl font-bold text-heading group-hover:text-primary transition-colors">{properties.length}</div>
              <div className="text-[10px] text-muted-label mt-2">Click to view all</div>
            </div>
            <div onClick={() => handleNavigate('/rooms', {})} className="bg-card border border-card-border rounded-lg p-4 shadow-sm hover:shadow-lg hover:border-primary transition-all cursor-pointer group">
              <div className="text-xs font-semibold text-muted-label uppercase tracking-wider mb-1">Rooms</div>
              <div className="text-2xl font-bold text-heading group-hover:text-primary transition-colors">{totalRooms}</div>
              <div className="text-[10px] text-muted-label mt-2">All rooms</div>
            </div>
            <div onClick={() => handleNavigate('/beds', {})} className="bg-card border border-card-border rounded-lg p-4 shadow-sm hover:shadow-lg hover:border-primary transition-all cursor-pointer group">
              <div className="text-xs font-semibold text-muted-label uppercase tracking-wider mb-1">Total Beds</div>
              <div className="text-2xl font-bold text-heading group-hover:text-primary transition-colors">{totalBeds}</div>
              <div className="text-[10px] text-muted-label mt-2">All beds</div>
            </div>
            <div onClick={() => handleNavigate('/beds', { status: 'available' })} className="bg-card border border-card-border rounded-lg p-4 shadow-sm hover:shadow-lg hover:border-accent-emerald transition-all cursor-pointer group">
              <div className="text-xs font-semibold text-muted-label uppercase tracking-wider mb-1">Available</div>
              <div className="text-2xl font-bold text-heading group-hover:text-accent-emerald transition-colors">{availableBeds}</div>
              <div className="text-[10px] text-muted-label mt-2">Ready for placement</div>
            </div>
            <div onClick={() => handleNavigate('/occupancy', {})} className="bg-card border border-card-border rounded-lg p-4 shadow-sm hover:shadow-lg hover:border-accent-amber transition-all cursor-pointer group">
              <div className="text-xs font-semibold text-muted-label uppercase tracking-wider mb-1">Occupancy</div>
              <div className="text-2xl font-bold text-heading group-hover:text-accent-amber transition-colors">{occupancyPercent}%</div>
              <div className="text-[10px] text-muted-label mt-2">Utilization</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div onClick={() => handleNavigate('/properties', { occupancy_level: 'full' })} className="bg-card border border-card-border rounded-lg p-4 shadow-sm hover:shadow-lg hover:border-accent-rose transition-all cursor-pointer group">
              <div className="text-xs font-semibold text-muted-label uppercase tracking-wider mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> At Capacity</div>
              <div className="text-2xl font-bold text-accent-rose group-hover:text-opacity-80 transition-colors">{fullHouses}</div>
              <div className="text-[10px] text-muted-label mt-2">100% occupied</div>
            </div>
            <div onClick={() => handleNavigate('/properties', { occupancy_level: 'near' })} className="bg-card border border-card-border rounded-lg p-4 shadow-sm hover:shadow-lg hover:border-accent-amber transition-all cursor-pointer group">
              <div className="text-xs font-semibold text-muted-label uppercase tracking-wider mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Near Capacity</div>
              <div className="text-2xl font-bold text-accent-amber group-hover:text-opacity-80 transition-colors">{nearCapacity}</div>
              <div className="text-[10px] text-muted-label mt-2">80%+ occupied</div>
            </div>
            <div
              onClick={() => handleNavigate('/beds', { status: 'needs_cleaning' })}
              className={`bg-card border rounded-lg p-4 shadow-sm hover:shadow-lg transition-all cursor-pointer group ${needsCleaningCount > 0 ? 'border-accent-amber' : 'border-card-border hover:border-accent-amber'}`}
            >
              <div className="text-xs font-semibold text-muted-label uppercase tracking-wider mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Needs Cleaning</div>
              <div className={`text-2xl font-bold transition-colors ${needsCleaningCount > 0 ? 'text-accent-amber' : 'text-heading group-hover:text-accent-amber'}`}>{needsCleaningCount}</div>
              <div className="text-[10px] text-muted-label mt-2">Beds pending turnover</div>
            </div>
            <div onClick={() => handleNavigate('/referrals', { status: 'under_review' })} className="bg-card border border-card-border rounded-lg p-4 shadow-sm hover:shadow-lg hover:border-accent-blue transition-all cursor-pointer group">
              <div className="text-xs font-semibold text-muted-label uppercase tracking-wider mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Pending</div>
              <div className="text-2xl font-bold text-accent-blue group-hover:text-opacity-80 transition-colors">{pendingReferrals}</div>
              <div className="text-[10px] text-muted-label mt-2">Referrals awaiting action</div>
            </div>
            <div onClick={() => handleNavigate('/move-requests', {})} className="bg-card border border-card-border rounded-lg p-4 shadow-sm hover:shadow-lg hover:border-primary transition-all cursor-pointer group">
              <div className="text-xs font-semibold text-muted-label uppercase tracking-wider mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Move Requests</div>
              <div className={`text-2xl font-bold transition-colors ${pendingMoves > 0 ? 'text-primary' : 'text-heading group-hover:text-primary'}`}>{pendingMoves}</div>
              <div className="text-[10px] text-muted-label mt-2">Pending action</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div onClick={() => handleNavigate('/properties', { housing_model: 'per_bed' })} className="bg-card rounded-lg border-t-2 border-primary from-primary/8 bg-gradient-to-br to-card p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer group">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-heading group-hover:text-primary transition-colors">PER-BED PROPERTIES</h3>
              </div>
              <div className="text-3xl font-bold text-white mb-2">{perBedProps.length}</div>
              <div className="text-sm text-body-text">{perBedProps.reduce((sum, p) => sum + (p.total_bed_count || 0), 0)} beds configured</div>
            </div>
            <div onClick={() => handleNavigate('/properties', { housing_model: 'turnkey_house' })} className="bg-card rounded-lg border-t-2 border-accent-amber from-accent-amber/8 bg-gradient-to-br to-card p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer group">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-accent-amber group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-heading group-hover:text-accent-amber transition-colors">TURNKEY PROPERTIES</h3>
              </div>
              <div className="text-3xl font-bold text-white mb-2">{turnkeyProps.length}</div>
              <div className="text-sm text-body-text">Whole-house leases</div>
            </div>
          </div>

          {isInternal && <RevenueSummaryWidget />}

          <div>
            <h2 className="text-lg font-bold text-heading mb-4">REJG LEGACY PROPERTIES — ALL HOMES</h2>
            {properties.length === 0 ? (
              <div className="bg-card rounded-lg border border-card-border p-12 text-center">
                <p className="text-body-text">No properties configured yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {properties.map((property) => (
                  <HouseCard
                    key={property.id}
                    property={property}
                    occupied_beds={occupancy.filter((o) => o.property_id === property.id && o.occupancy_status === 'active').length}
                    onClick={() => navigate(`/property/${property.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}