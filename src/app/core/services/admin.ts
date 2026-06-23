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
import { Auth, CaregiverProfileDocument, UserAccount } from './auth';

export type AdminRole = 'super_user' | 'admin' | 'reviewer';
export type ReviewProfileType = 'caregiver' | 'family';
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
  type: ReviewProfileType;
  status: ReviewStatus;
  requestedAt: Date | null;
  lockedBy: string | null;
  fullName: string;
  district: string;
  raw: Record<string, unknown>;
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
    if (!this.getPermissions(currentAdmin).canManageAdmins) {
      throw new FirebaseError('permission-denied', 'Não tem permissão para gerir administradores.');
    }

    const snapshot = await getDocs(query(collection(firestoreDb, 'adminProfiles'), orderBy('email')));
    return snapshot.docs.map((adminDoc) => this.toAdminProfile(adminDoc.id, adminDoc.data()));
  }

  async saveAdminProfile(input: {
    uid: string;
    email: string;
    displayName: string;
    role: AdminRole;
    enabled: boolean;
  }): Promise<void> {
    const currentAdmin = await this.requireAdmin();
    if (!this.getPermissions(currentAdmin).canManageAdmins) {
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
    const [caregiversSnapshot, usersSnapshot] = await Promise.all([
      getDocs(query(collection(firestoreDb, 'caregivers'), orderBy('createdAt', 'asc'), limit(80))),
      getDocs(query(collection(firestoreDb, 'users'), orderBy('createdAt', 'asc'), limit(80))),
    ]);

    const caregivers = caregiversSnapshot.docs.map((reviewDoc) =>
      this.toCaregiverReviewQueueItem(reviewDoc.id, reviewDoc.data() as CaregiverProfileDocument),
    );
    const families = usersSnapshot.docs
      .map((userDoc) => this.toFamilyReviewQueueItem(userDoc.id, userDoc.data() as UserAccount & Record<string, unknown>))
      .filter((item): item is ReviewQueueItem => !!item);

    return [...caregivers, ...families]
      .filter((item) => item.status === 'pending' || item.status === 'analysing')
      .sort((a, b) => this.timeValue(a.requestedAt) - this.timeValue(b.requestedAt))
      .slice(0, 80);
  }

  async getReviewItem(type: ReviewProfileType, id: string): Promise<ReviewQueueItem | null> {
    await this.requireAdmin();

    if (type === 'family') {
      const snapshot = await getDoc(doc(firestoreDb, 'users', id));
      if (!snapshot.exists()) {
        return null;
      }

      return this.toFamilyReviewQueueItem(snapshot.id, snapshot.data() as UserAccount & Record<string, unknown>);
    }

    const [caregiverSnapshot, userSnapshot] = await Promise.all([
      getDoc(doc(firestoreDb, 'caregivers', id)),
      getDoc(doc(firestoreDb, 'users', id)),
    ]);
    if (!caregiverSnapshot.exists()) {
      return null;
    }

    const caregiverData = caregiverSnapshot.data() as CaregiverProfileDocument;
    const userData = userSnapshot.exists()
      ? (userSnapshot.data() as UserAccount & Record<string, unknown>)
      : null;

    return this.toCaregiverReviewQueueItem(
      caregiverSnapshot.id,
      this.withCaregiverAccountData(caregiverData, userData),
    );
  }

  async startReview(type: ReviewProfileType, id: string): Promise<void> {
    if (type === 'family') {
      await this.startFamilyReview(id);
      return;
    }

    await this.startCaregiverReview(id);
  }

  async unlockReview(type: ReviewProfileType, id: string): Promise<void> {
    if (type === 'family') {
      await this.unlockFamilyReview(id);
      return;
    }

    await this.unlockCaregiverReview(id);
  }

  async decideReview(type: ReviewProfileType, id: string, decision: 'approved' | 'rejected', rejectionReason = ''): Promise<void> {
    if (type === 'family') {
      await this.decideFamilyReview(id, decision, rejectionReason);
      return;
    }

    await this.decideCaregiverReview(id, decision, rejectionReason);
  }

  private async startCaregiverReview(id: string): Promise<void> {
    const admin = await this.requireReviewer();
    const reviewRef = doc(firestoreDb, 'caregivers', id);
    const userRef = doc(firestoreDb, 'users', id);

    await runTransaction(firestoreDb, async (transaction) => {
      const snapshot = await transaction.get(reviewRef);
      if (!snapshot.exists()) {
        throw new FirebaseError('not-found', 'Cadastro não encontrado.');
      }

      const data = snapshot.data();
      if (this.getCaregiverReviewStatus(data) !== 'pending') {
        throw new FirebaseError('failed-precondition', 'Este cadastro já está em análise ou decidido.');
      }

      transaction.update(reviewRef, {
        'review.status': 'analysing',
        'review.lockedBy': admin.uid,
        'review.lockedAt': serverTimestamp(),
        approvalStatus: 'analysing',
        updatedAt: serverTimestamp(),
      });
      transaction.set(
        userRef,
        {
          caregiverProfileStatus: 'analysing',
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    });
  }

  private async startFamilyReview(id: string): Promise<void> {
    const admin = await this.requireReviewer();
    const userRef = doc(firestoreDb, 'users', id);

    await runTransaction(firestoreDb, async (transaction) => {
      const snapshot = await transaction.get(userRef);
      if (!snapshot.exists()) {
        throw new FirebaseError('not-found', 'Cadastro não encontrado.');
      }

      const data = snapshot.data();
      if (this.getFamilyReviewStatus(data) !== 'pending') {
        throw new FirebaseError('failed-precondition', 'Este cadastro já está em análise ou decidido.');
      }

      transaction.update(userRef, {
        familyProfileStatus: 'analysing',
        'familyReview.status': 'analysing',
        'familyReview.lockedBy': admin.uid,
        'familyReview.lockedAt': serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  }

  private async unlockCaregiverReview(id: string): Promise<void> {
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
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    await setDoc(
      doc(firestoreDb, 'users', id),
      {
        caregiverProfileStatus: 'pending',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  private async unlockFamilyReview(id: string): Promise<void> {
    const admin = await this.requireAdmin();
    if (!this.getPermissions(admin).canUnlockReview) {
      throw new FirebaseError('permission-denied', 'Apenas o super utilizador pode destravar análises.');
    }

    await setDoc(
      doc(firestoreDb, 'users', id),
      {
        familyProfileStatus: 'pending',
        familyReview: {
          status: 'pending',
          lockedBy: null,
          lockedAt: null,
        },
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  private async decideCaregiverReview(id: string, decision: 'approved' | 'rejected', rejectionReason = ''): Promise<void> {
    const admin = await this.requireReviewer();
    this.validateDecision(decision, rejectionReason);

    const reviewRef = doc(firestoreDb, 'caregivers', id);
    const userRef = doc(firestoreDb, 'users', id);
    await runTransaction(firestoreDb, async (transaction) => {
      const snapshot = await transaction.get(reviewRef);
      if (!snapshot.exists()) {
        throw new FirebaseError('not-found', 'Cadastro não encontrado.');
      }

      const data = snapshot.data();
      this.validateLockedReview(data, admin);

      transaction.update(reviewRef, {
        'review.status': decision,
        'review.decidedBy': admin.uid,
        'review.decidedAt': serverTimestamp(),
        'review.rejectionReason': decision === 'rejected' ? rejectionReason.trim() : null,
        approval: decision === 'approved',
        approvalStatus: decision,
        approvalUserId: decision === 'approved' ? admin.uid : null,
        approvalDate: decision === 'approved' ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });
      transaction.set(
        userRef,
        {
          caregiverProfileStatus: decision,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    });
  }

  private async decideFamilyReview(id: string, decision: 'approved' | 'rejected', rejectionReason = ''): Promise<void> {
    const admin = await this.requireReviewer();
    this.validateDecision(decision, rejectionReason);

    const userRef = doc(firestoreDb, 'users', id);
    await runTransaction(firestoreDb, async (transaction) => {
      const snapshot = await transaction.get(userRef);
      if (!snapshot.exists()) {
        throw new FirebaseError('not-found', 'Cadastro não encontrado.');
      }

      const data = snapshot.data();
      if (this.getFamilyReviewStatus(data) !== 'analysing') {
        throw new FirebaseError('failed-precondition', 'É necessário iniciar a análise antes de decidir.');
      }
      const lockedBy = this.valueAt(data, 'familyReview.lockedBy');
      if (lockedBy && lockedBy !== admin.uid && admin.role !== 'super_user') {
        throw new FirebaseError('permission-denied', 'Este cadastro está bloqueado por outro revisor.');
      }

      transaction.update(userRef, {
        familyProfileStatus: decision,
        'familyReview.status': decision,
        'familyReview.decidedBy': admin.uid,
        'familyReview.decidedAt': serverTimestamp(),
        'familyReview.rejectionReason': decision === 'rejected' ? rejectionReason.trim() : null,
        updatedAt: serverTimestamp(),
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

  private validateDecision(decision: 'approved' | 'rejected', rejectionReason: string): void {
    if (decision === 'rejected' && !rejectionReason.trim()) {
      throw new FirebaseError('invalid-argument', 'A justificativa é obrigatória para rejeitar.');
    }
  }

  private validateLockedReview(data: Record<string, unknown>, admin: AdminProfile): void {
    if (this.getCaregiverReviewStatus(data) !== 'analysing') {
      throw new FirebaseError('failed-precondition', 'É necessário iniciar a análise antes de decidir.');
    }

    const lockedBy = this.valueAt(data, 'review.lockedBy');
    if (lockedBy && lockedBy !== admin.uid && admin.role !== 'super_user') {
      throw new FirebaseError('permission-denied', 'Este cadastro está bloqueado por outro revisor.');
    }
  }

  private toAdminProfile(uid: string, data: Record<string, unknown>): AdminProfile {
    return {
      uid,
      email: this.stringAt(data, 'email'),
      displayName: this.stringAt(data, 'displayName'),
      enabled: data['enabled'] === true,
      role: this.isAdminRole(data['role']) ? data['role'] : 'reviewer',
    };
  }

  private toCaregiverReviewQueueItem(id: string, data: CaregiverProfileDocument): ReviewQueueItem {
    const publicProfile = this.objectAt(data, 'publicProfile');
    const review = this.objectAt(data, 'review');

    return {
      id,
      type: 'caregiver',
      status: this.getCaregiverReviewStatus(data),
      requestedAt: this.toDate(review['requestedAt'] ?? data['createdAt']),
      lockedBy: typeof review['lockedBy'] === 'string' ? review['lockedBy'] : null,
      fullName: this.stringAt(publicProfile, 'fullName') || 'Cuidador sem nome',
      district: this.stringAt(publicProfile, 'district') || 'Sem distrito',
      raw: data,
    };
  }

  private withCaregiverAccountData(
    caregiverData: CaregiverProfileDocument,
    userData: (UserAccount & Record<string, unknown>) | null,
  ): CaregiverProfileDocument {
    if (!userData) {
      return caregiverData;
    }

    return {
      ...caregiverData,
      email: userData.email ?? caregiverData['email'],
      account: userData,
    };
  }

  private toFamilyReviewQueueItem(id: string, data: UserAccount & Record<string, unknown>): ReviewQueueItem | null {
    const isFamily = data.roles?.family || data.role === 'family';
    if (!isFamily) {
      return null;
    }

    const familyReview = this.objectAt(data, 'familyReview');

    return {
      id,
      type: 'family',
      status: this.getFamilyReviewStatus(data),
      requestedAt: this.toDate(familyReview['requestedAt'] ?? data['createdAt']),
      lockedBy: typeof familyReview['lockedBy'] === 'string' ? familyReview['lockedBy'] : null,
      fullName: data.fullName || 'Família sem nome',
      district: data.location?.district || 'Sem distrito',
      raw: data,
    };
  }

  private getCaregiverReviewStatus(data: Record<string, unknown>): ReviewStatus {
    return this.toReviewStatus(this.valueAt(data, 'review.status') ?? data['approvalStatus'] ?? data['status']);
  }

  private getFamilyReviewStatus(data: Record<string, unknown>): ReviewStatus {
    return this.toReviewStatus(this.valueAt(data, 'familyReview.status') ?? data['familyProfileStatus']);
  }

  private toReviewStatus(value: unknown): ReviewStatus {
    if (value === 'analysing' || value === 'analysinig') {
      return 'analysing';
    }
    if (value === 'approved' || value === 'done' || value === 'Done') {
      return 'approved';
    }
    if (value === 'rejected' || value === 'refused' || value === 'recusado') {
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

  private timeValue(date: Date | null): number {
    return date?.getTime() ?? 0;
  }

  private isAdminRole(value: unknown): value is AdminRole {
    return value === 'super_user' || value === 'admin' || value === 'reviewer';
  }
}
