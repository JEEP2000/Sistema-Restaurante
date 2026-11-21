import { Observable } from 'rxjs';
import { DashboardStatsRepositoryPort } from '../out/dashboard-stats.repository.port.js';
import { DashboardStats } from '../../../domain/models/dashboard-stats.model.js';

export class GetDashboardStatsUseCase {
  constructor(private statsRepository: DashboardStatsRepositoryPort) {}

  execute(sucursalId?: number): Observable<DashboardStats> {
    return this.statsRepository.getStats(sucursalId);
  }
}
