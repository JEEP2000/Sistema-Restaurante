import { Observable } from 'rxjs';
import { DashboardStats } from '../../../domain/models/dashboard-stats.model.js';

export interface DashboardStatsRepositoryPort {
  getStats(sucursalId?: number): Observable<DashboardStats>;
}
