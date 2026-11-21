import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DashboardStatsRepositoryPort } from '../../../application/ports/out/dashboard-stats.repository.port.js';
import { DashboardStats } from '../../../domain/models/dashboard-stats.model.js';

@Injectable()
export class HttpDashboardStatsRepositoryAdapter implements DashboardStatsRepositoryPort {
  private apiUrl = 'http://localhost:3000/api/pedidos/stats';

  constructor(private http: HttpClient) {}

  getStats(sucursalId?: number): Observable<DashboardStats> {
    let params = new HttpParams();
    if (sucursalId !== undefined && sucursalId !== null) {
      params = params.set('sucursalId', sucursalId.toString());
    }

    return this.http.get<{ success: boolean; data: DashboardStats }>(this.apiUrl, { params }).pipe(
      map(response => response.data)
    );
  }
}
