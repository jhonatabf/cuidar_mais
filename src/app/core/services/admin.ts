import { Injectable, inject } from '@angular/core';
import { FirebaseError } from 'firebase/app';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { firestoreDb } from '../firebase/firebase.config';
import { Auth, CaregiverProfileDocument } from './auth';

export type AdminRole = 'super_user' | 'admin' | 'reviewer';
export type ReviewStatus = 'pending' | 'analysing' | 'approved' | 'rejected';

export interface AdminProfile {
  uid: string;
  email?: string;
  displayName?: string;
  enabled: boolean;
  role: AdminRole;
}

export interface AdminPermissions {
  canAccessAdmin: boolean;
  canManageAdmins: boolean;
  canReview: boolean;
  canUnlockReview: boolean;
}

export interface ReviewQueueItem {
  id: string;
  type: 'caregiver' | 'family';
  status: ReviewStatus;
  requestedAt: Date | null;
  lockedBy: string | null;
  fullName: string;
  district: string;
  raw: CaregiverProfileDocument;
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly auth = inject(Auth);

  async getCurrentAdminProfile(): Promise<AdminProfile | null> {
    const user = await this.auth.getCurrentUser();
    if (!user) {
      return null;
    }

    return this.getAdminProfile(user.uid);
  }

  async getAdminProfile(uid: string): Promise<AdminProfile | null> {
    const snapshot = await getDoc(doc(firestoreDb, 'adminProfiles', uid));
    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data() as Partial<AdminProfile>;
    if (!data.enabled || !this.isAdminRole(data.role)) {
      return null;
    }

    return {
      uid,
      email: data.email,
      displayName: data.displayName,
      enabled: true,
      role: data.role,
    };
  }

  getPermissions(profile: AdminProfile | null): AdminPermissions {
    const role = profile?.enabled ? profile.role : null;

    return {
      canAccessAdmin: !!role,
      canManageAdmins: role === 'super_user' || role === 'admin',
      canReview: role === 'super_user' || role === 'reviewer',
      canUnlockReview: role === 'super_user',
    };
  }

  async listAdminProfiles(): Promise<AdminProfile[]> {
    const currentAdmin = await this.requireAdmin();
    const permissions = this.getPermissions(currentAdmin);
    if (!permissions.canManageAdmins) {
      throw new FirebaseError('permission-denied', 'Não tem permissão para gerir administradores.');
    }

    const snapshot = await getDocs(query(collection(firestoreDb, 'adminProfiles'), orderBy('email')));
    return snapshot.docs.map((adminDoc) => {
      const data = adminDoc.data() as Partial<AdminProfile>;
      return {
        uid: adminDoc.id,
        email: data.email,
        displayName: data.displayName,
        enabled: data.enabled === true,
        role: this.isAdminRole(data.role) ? data.role : 'reviewer',
      };
    });
  }

  async saveAdminProfile(input: {
    uid: string;
    email: string;
    displayName: string;
    role: AdminRole;
    enabled: boolean;
  }): Promise<void> {
    const currentAdmin = await this.requireAdmin();
    const permissions = this.getPermissions(currentAdmin);
    if (!permissions.canManageAdmins) {
      throw new FirebaseError('permission-denied', 'Não tem permissão para gerir administradores.');
    }
    if (input.role === 'super_user' && currentAdmin.role !== 'super_user') {
      throw new FirebaseError('permission-denied', 'Apenas o super utilizador pode atribuir esse perfil.');
    }

    await setDoc(
      doc(firestoreDb, 'adminProfiles', input.uid),
      {
        uid: input.uid,
        email: input.email,
        displayName: input.displayName,
        enabled: input.enabled,
        role: input.role,
        updatedAt: serverTimestamp(),
        updatedBy: currentAdmin.uid,
      },
      { merge: true },
    );
  }

  async listReviewQueue(): Promise<ReviewQueueItem[]> {
    await this.requireAdmin();
    const snapshot = await getDocs(
      query(
        collection(firestoreDb, 'caregivers'),
        orderBy('review.requestedAt', 'asc'),
        limit(50),
      ),
    );

    return snapshot.docs
      .map((reviewDoc) => this.toReviewQueueItem(reviewDoc.id, reviewDoc.data()))
      .filter((item) => item.status === 'pending' || item.status === 'analysing');
  }

  async getReviewItem(id: string): Promise<ReviewQueueItem | null> {
    await this.requireAdmin();
    const snapshot = await getDoc(doc(firestoreDb, 'caregivers', id));
    if (!snapshot.exists()) {
      return null;
    }

    return this.toReviewQueueItem(snapshot.id, snapshot.data());
  }

  async startCaregiverReview(id: string): Promise<void> {
    const admin = await this.requireReviewer();
    const reviewRef = doc(firestoreDb, 'caregivers', id);

    await runTransaction(firestoreDb, async (transaction) => {
      const snapshot = await transaction.get(reviewRef);
      if (!snapshot.exists()) {
        throw new FirebaseError('not-found', 'Cadastro não encontrado.');
      }

      const data = snapshot.data();
      const status = this.getReviewStatus(data);
      if (status !== 'pending') {
        throw new FirebaseError('failed-precondition', 'Este cadastro já está em análise ou decidido.');
      }

      transaction.update(reviewRef, {
        'review.status': 'analysing',
        'review.lockedBy': admin.uid,
        'review.lockedAt': serverTimestamp(),
        approvalStatus: 'analysing',
      });
    });
  }

  async unlockCaregiverReview(id: string): Promise<void> {
    const admin = await this.requireAdmin();
    if (!this.getPermissions(admin).canUnlockReview) {
      throw new FirebaseError('permission-denied', 'Apenas o super utilizador pode destravar análises.');
    }

    await setDoc(
      doc(firestoreDb, 'caregivers', id),
      {
        review: {
          status: 'pending',
          lockedBy: null,
          lockedAt: null,
        },
        approvalStatus: 'pending',
      },
      { merge: true },
    );
  }

  async decideCaregiverReview(id: string, decision: 'approved' | 'rejected', rejectionReason = ''): Promise<void> {
    const admin = await this.requireReviewer();
    if (decision === 'rejected' && !rejectionReason.trim()) {
      throw new FirebaseError('invalid-argument', 'A justificativa é obrigatória para rejeitar.');
    }

    const reviewRef = doc(firestoreDb, 'caregivers', id);
    await runTransaction(firestoreDb, async (transaction) => {
      const snapshot = await transaction.get(reviewRef);
      if (!snapshot.exists()) {
        throw new FirebaseError('not-found', 'Cadastro não encontrado.');
      }

      const data = snapshot.data();
      const status = this.getReviewStatus(data);
      const lockedBy = this.valueAt(data, 'review.lockedBy');
      if (status !== 'analysing') {
        throw new FirebaseError('failed-precondition', 'É necessário iniciar a análise antes de decidir.');
      }
      if (lockedBy && lockedBy !== admin.uid && admin.role !== 'super_user') {
        throw new FirebaseError('permission-denied', 'Este cadastro está bloqueado por outro revisor.');
      }

      transaction.update(reviewRef, {
        'review.status': decision,
        'review.decidedBy': admin.uid,
        'review.decidedAt': serverTimestamp(),
        'review.rejectionReason': decision === 'rejected' ? rejectionReason.trim() : null,
        approval: decision === 'approved',
        approvalStatus: decision,
        approvalUserId: decision === 'approved' ? admin.uid : null,
        approvalDate: decision === 'approved' ? serverTimestamp() : null,
      });
    });
  }

  private async requireAdmin(): Promise<AdminProfile> {
    const profile = await this.getCurrentAdminProfile();
    if (!profile) {
      throw new FirebaseError('permission-denied', 'É necessário ter perfil administrativo ativo.');
    }

    return profile;
  }

  private async requireReviewer(): Promise<AdminProfile> {
    const profile = await this.requireAdmin();
    if (!this.getPermissions(profile).canReview) {
      throw new FirebaseError('permission-denied', 'Não tem permissão para rever cadastros.');
    }

    return profile;
  }

  private toReviewQueueItem(id: string, data: CaregiverProfileDocument): ReviewQueueItem {
    const publicProfile = this.objectAt(data, 'publicProfile');
    const review = this.objectAt(data, 'review');

    return {
      id,
      type: 'caregiver',
      status: this.getReviewStatus(data),
      requestedAt: this.toDate(review['requestedAt'] ?? data['createdAt']),
      lockedBy: typeof review['lockedBy'] === 'string' ? review['lockedBy'] : null,
      fullName: this.stringAt(publicProfile, 'fullName') || 'Cuidador sem nome',
      district: this.stringAt(publicProfile, 'district') || 'Sem distrito',
      raw: data,
    };
  }

  private getReviewStatus(data: Record<string, unknown>): ReviewStatus {
    const reviewStatus = this.valueAt(data, 'review.status') ?? data['approvalStatus'] ?? data['status'];
    if (reviewStatus === 'analysing' || reviewStatus === 'analysinig') {
      return 'analysing';
    }
    if (reviewStatus === 'approved' || reviewStatus === 'done' || reviewStatus === 'Done') {
      return 'approved';
    }
    if (reviewStatus === 'rejected') {
      return 'rejected';
    }

    return 'pending';
  }

  private valueAt(data: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      if (!current || typeof current !== 'object') {
        return undefined;
      }

      return (current as Record<string, unknown>)[key];
    }, data);
  }

  private objectAt(data: Record<string, unknown>, path: string): Record<string, unknown> {
    const value = this.valueAt(data, path);
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }

  private stringAt(data: Record<string, unknown>, key: string): string {
    const value = data[key];
    return typeof value === 'string' ? value : '';
  }

  private toDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
      return value.toDate();
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    return null;
  }

  private isAdminRole(value: unknown): value is AdminRole {
    return value === 'super_user' || value === 'admin' || value === 'reviewer';
  }
}
