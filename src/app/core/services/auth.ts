import { Injectable } from '@angular/core';
import { FirebaseError } from 'firebase/app';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { firebaseAuth, firebaseStorage, firestoreDb } from '../firebase/firebase.config';

const FIREBASE_OPERATION_TIMEOUT_MS = 20000;

export interface CaregiverTrainingCertificate {
  storagePath: string;
  fileName: string;
  contentType: string;
  originalSize: number;
  compressedSize: number;
  uploadedAt: string;
  status: 'pending';
}

export interface CaregiverTrainingCertificateUpload {
  name: string;
  contentType: string;
  originalSize: number;
  compressedSize: number;
  blob: Blob;
}

export interface UserProfilePhoto {
  storagePath: string;
  downloadUrl: string;
  fileName: string;
  contentType: string;
  originalSize: number;
  compressedSize: number;
  uploadedAt: string;
}

export interface UserProfilePhotoUpload {
  name: string;
  contentType: string;
  originalSize: number;
  compressedSize: number;
  blob: Blob;
}

export interface CaregiverRegistration {
  professional: {
    summary: string;
    experienceYears: number;
    serviceTypes: string[];
  };
  training: {
    items: {
      id: string;
      trainingType: string;
      courseName: string;
      trainingEntity: string;
      completionDate: string;
      certificateFileName: string;
      certificate: CaregiverTrainingCertificate | null;
      certificateUpload: CaregiverTrainingCertificateUpload | null;
    }[];
  };
  availability: {
    weekDays: string[];
    periods: string[];
    availabilityTypes: string[];
  };
  rates: {
    hourlyRate: number;
    shiftRate: number | null;
    dayRate: number | null;
    monthlyRate: number | null;
  };
  skills: string[];
  languages: string[];
  mobility: {
    drivingLicense: boolean;
    ownVehicle: boolean;
    acceptsTravel: boolean;
    travelRadius: string;
  };
  reference: {
    name: string;
    contact: string;
    contactCountry: string;
    contactCallingCode: string;
    contactNational: string;
    relation: string;
  };
}

export interface UserPersonalData {
  email: string;
  fullName: string;
  birthDate: string;
  gender: string;
  nationality: string;
  phone: string;
  phoneCountry: string;
  phoneCallingCode: string;
  phoneNational: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  private: {
    nif: string;
    documentType: string;
    idDocument: string;
    address: string;
    postalCode: string;
  };
  location: {
    district: string;
    county: string;
  };
}

export interface UserAccount {
  uid: string;
  email: string;
  fullName: string;
  birthDate?: string;
  gender?: string;
  nationality?: string;
  phone?: string;
  phoneCountry?: string;
  phoneCallingCode?: string;
  phoneNational?: string;
  acceptedTerms?: boolean;
  acceptedPrivacy?: boolean;
  private?: {
    nif?: string;
    documentType?: string;
    idDocument?: string;
    address?: string;
    postalCode?: string;
  };
  location?: {
    district?: string;
    county?: string;
  };
  role?: 'caregiver' | 'family';
  roles?: {
    caregiver?: boolean;
    family?: boolean;
  };
  caregiverProfileStatus?: string;
  familyProfileStatus?: string;
  profilePhoto?: UserProfilePhoto | null;
  profilePhotoName?: string;
  emailVerified?: boolean;
}

export type CaregiverProfileDocument = Record<string, unknown>;

export type CaregiverApprovalStatus = 'pending' | 'analysing' | 'approved' | 'rejected';

export interface CaregiverApprovalSummary {
  approval: boolean;
  approvalStatus: CaregiverApprovalStatus;
  approvalDate: Date | null;
  approvalUserId: string | null;
  canEditFrom: Date | null;
  canEdit: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class Auth {
  onUserChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(firebaseAuth, callback);
  }

  async registerAccount(data: {
    accountType: string;
    fullName: string;
    birthDate: string;
    nif: string;
    documentType: string;
    idDocument: string;
    email: string;
    password: string;
  }): Promise<User> {
    const credential = await createUserWithEmailAndPassword(firebaseAuth, data.email, data.password);
    await updateProfile(credential.user, { displayName: data.fullName });

    await setDoc(doc(firestoreDb, 'users', credential.user.uid), {
      uid: credential.user.uid,
      email: data.email,
      fullName: data.fullName,
      birthDate: data.birthDate,
      private: {
        nif: data.nif,
        documentType: data.documentType,
        idDocument: data.idDocument,
      },
      role: data.accountType === 'Cuidador' ? 'caregiver' : 'family',
      roles: {
        caregiver: data.accountType === 'Cuidador',
        family: data.accountType !== 'Cuidador',
      },
      caregiverProfileStatus: data.accountType === 'Cuidador' ? 'pending' : null,
      familyProfileStatus: data.accountType === 'Cuidador' ? null : 'pending',
      familyReview:
        data.accountType === 'Cuidador'
          ? null
          : {
              status: 'pending',
              requestedAt: serverTimestamp(),
              lockedBy: null,
              lockedAt: null,
              decidedBy: null,
              decidedAt: null,
              rejectionReason: null,
            },
      emailVerified: credential.user.emailVerified,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await this.sendEmailVerificationMessage(credential.user);

    return credential.user;
  }

  async signIn(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    await this.syncEmailVerificationStatus(credential.user);
    return credential.user;
  }

  async signOut(): Promise<void> {
    await signOut(firebaseAuth);
  }

  getCurrentUser(): Promise<User | null> {
    if (firebaseAuth.currentUser) {
      return Promise.resolve(firebaseAuth.currentUser);
    }

    return new Promise((resolve) => {
      let unsubscribe = (): void => undefined;
      const timeoutId = window.setTimeout(() => {
        unsubscribe();
        resolve(firebaseAuth.currentUser);
      }, 1500);

      unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        window.clearTimeout(timeoutId);
        unsubscribe();
        resolve(user);
      });
    });
  }

  async getCaregiverStatus(uid: string): Promise<string | null> {
    const snapshot = await getDoc(doc(firestoreDb, 'caregivers', uid));
    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    return typeof data['status'] === 'string' ? data['status'] : 'draft';
  }

  async getCaregiverProfile(uid: string): Promise<CaregiverProfileDocument | null> {
    const snapshot = await getDoc(doc(firestoreDb, 'caregivers', uid));
    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data() as CaregiverProfileDocument;
  }

  getCaregiverApprovalSummary(
    caregiverProfile: CaregiverProfileDocument | null,
  ): CaregiverApprovalSummary {
    const approvalDate = this.toDate(caregiverProfile?.['approvalDate'] ?? caregiverProfile?.['data']);
    const approval = caregiverProfile?.['approval'] === true;
    const storedApprovalStatus = this.toApprovalStatus(
      caregiverProfile?.['approvalStatus'] ?? caregiverProfile?.['status'],
    );
    const approvalStatus: CaregiverApprovalStatus = approval ? 'approved' : storedApprovalStatus;
    const approvalUserId =
      typeof (caregiverProfile?.['approvalUserId'] ?? caregiverProfile?.['userId']) === 'string'
        ? (caregiverProfile?.['approvalUserId'] ?? caregiverProfile?.['userId']) as string
        : null;
    const canEditFrom = approvalDate ? this.addDays(approvalDate, 5) : null;

    return {
      approval,
      approvalStatus,
      approvalDate,
      approvalUserId,
      canEditFrom,
      canEdit: !approval || !canEditFrom || canEditFrom <= new Date(),
    };
  }

  async hasCaregiverProfile(uid: string): Promise<boolean> {
    return (await this.getCaregiverStatus(uid)) !== null;
  }

  async getUserAccount(uid: string): Promise<UserAccount | null> {
    const snapshot = await getDoc(doc(firestoreDb, 'users', uid));
    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data() as UserAccount;
  }

  async updateUserPersonalData(data: UserPersonalData): Promise<void> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new FirebaseError('auth/requires-recent-login', 'É necessário iniciar sessão para alterar os dados pessoais.');
    }

    await Promise.all([
      updateProfile(user, { displayName: data.fullName }),
      setDoc(
        doc(firestoreDb, 'users', user.uid),
        {
          uid: user.uid,
          email: user.email ?? data.email,
          fullName: data.fullName,
          birthDate: data.birthDate,
          gender: data.gender,
          nationality: data.nationality,
          phone: data.phone,
          phoneCountry: data.phoneCountry,
          phoneCallingCode: data.phoneCallingCode,
          phoneNational: data.phoneNational,
          acceptedTerms: data.acceptedTerms,
          acceptedPrivacy: data.acceptedPrivacy,
          private: data.private,
          location: data.location,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
    ]);
  }

  async sendCurrentUserEmailVerification(): Promise<void> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new FirebaseError('auth/requires-recent-login', 'É necessário iniciar sessão para validar o email.');
    }

    await this.sendEmailVerificationMessage(user);
  }

  async refreshCurrentUserEmailVerification(): Promise<boolean> {
    const user = await this.getCurrentUser();
    if (!user) {
      return false;
    }

    await reload(user);
    await this.syncEmailVerificationStatus(user);
    return user.emailVerified;
  }

  async isCurrentUserEmailVerified(): Promise<boolean> {
    const user = await this.getCurrentUser();
    if (!user) {
      return false;
    }

    await reload(user);
    return user.emailVerified;
  }

  async getProfileSummary(uid: string): Promise<{
    account: UserAccount | null;
    hasCaregiver: boolean;
    hasFamily: boolean;
    caregiverStatus: string | null;
  }> {
    const [account, caregiverStatus] = await Promise.all([
      this.getUserAccount(uid),
      this.getCaregiverStatus(uid),
    ]);

    return {
      account,
      hasCaregiver: !!caregiverStatus || !!account?.roles?.caregiver || account?.role === 'caregiver',
      hasFamily: !!account?.roles?.family || account?.role === 'family',
      caregiverStatus,
    };
  }

  async getFamilyStatus(uid: string): Promise<string | null> {
    const account = await this.getUserAccount(uid);
    if (!account?.roles?.family && account?.role !== 'family') {
      return null;
    }

    return account.familyProfileStatus ?? 'pending';
  }

  async getPostLoginRedirect(uid: string): Promise<string> {
    const [account, caregiverStatus] = await Promise.all([
      this.getUserAccount(uid),
      this.getCaregiverStatus(uid),
    ]);

    if (!account) {
      return '/cadastro';
    }

    if (this.getMissingPersonalDataFields(account).length > 0) {
      const nextStep = account?.roles?.caregiver || account?.role === 'caregiver'
        ? '/seja-cuidador'
        : '/dashboard/familia';
      return `/meus-dados-pessoais?redirectTo=${encodeURIComponent(nextStep)}`;
    }

    if (caregiverStatus) {
      return '/dashboard/cuidador';
    }

    if (account?.roles?.caregiver || account?.role === 'caregiver') {
      return '/seja-cuidador';
    }

    if (account?.roles?.family || account?.role === 'family') {
      return '/dashboard/familia';
    }

    return '/dashboard/familia';
  }

  async registerCaregiver(data: CaregiverRegistration): Promise<string> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new FirebaseError('auth/requires-recent-login', 'É necessário iniciar sessão para criar o perfil de cuidador.');
    }

    const uid = user.uid;
    const account = await this.getUserAccount(uid);
    if (!this.hasCompletePersonalData(account)) {
      throw new FirebaseError(
        'failed-precondition',
        'Complete os seus dados pessoais antes de criar ou atualizar o perfil de cuidador.',
      );
    }

    const existingProfile = await this.getCaregiverProfile(uid);
    const approvalSummary = this.getCaregiverApprovalSummary(existingProfile);
    if (!approvalSummary.canEdit) {
      throw new FirebaseError(
        'permission-denied',
        `Os dados pessoais só podem ser alterados novamente a partir de ${this.formatDate(approvalSummary.canEditFrom)}.`,
      );
    }

    const isNewProfile = !existingProfile;
    const persistedTrainingItems = await this.withTimeout(
      this.uploadCaregiverTrainingCertificates(uid, data.training.items),
      'Não foi possível enviar os certificados. Verifique a ligação e tente novamente.',
    );
    const firstTraining = persistedTrainingItems[0] ?? null;
    await this.withTimeout(
      updateProfile(user, { displayName: account.fullName }),
      'Não foi possível atualizar a conta. Verifique a ligação e tente novamente.',
    );

    await this.withTimeout(
      Promise.all([
        setDoc(
          doc(firestoreDb, 'users', uid),
          {
            uid,
            email: user.email ?? account.email,
            role: 'caregiver',
            roles: {
              caregiver: true,
            },
            caregiverProfileStatus: 'pending',
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ),
        setDoc(
          doc(firestoreDb, 'caregivers', uid),
          {
            uid,
            email: user.email ?? account.email,
            status: 'pending',
            approvalDate: isNewProfile ? null : existingProfile['approvalDate'] ?? null,
            approvalUserId: null,
            approvalStatus: 'pending',
            approval: false,
            review: {
              status: 'pending',
              requestedAt: serverTimestamp(),
              lockedBy: null,
              lockedAt: null,
              decidedBy: null,
              decidedAt: null,
              rejectionReason: null,
            },
            publicProfile: {
              fullName: account.fullName,
              gender: account.gender,
              nationality: account.nationality,
              district: account.location?.district,
              county: account.location?.county,
              travelRadius: data.mobility.travelRadius,
              summary: data.professional.summary,
              experienceYears: data.professional.experienceYears,
              serviceTypes: data.professional.serviceTypes,
              trainingTypes: persistedTrainingItems.map((item) => item.trainingType),
              availability: data.availability,
              rates: data.rates,
              skills: data.skills,
              languages: data.languages,
              mobility: data.mobility,
            },
            private: {
              birthDate: account.birthDate,
              phone: account.phone,
              nif: account.private?.nif,
              documentType: account.private?.documentType,
              idDocument: account.private?.idDocument,
              address: account.private?.address,
              postalCode: account.private?.postalCode,
              training: {
                items: persistedTrainingItems,
                courseName: firstTraining?.courseName ?? '',
                trainingEntity: firstTraining?.trainingEntity ?? '',
                completionYear: firstTraining?.completionDate
                  ? Number(firstTraining.completionDate.slice(0, 4))
                  : null,
              },
              reference: data.reference,
            },
            createdAt: isNewProfile ? serverTimestamp() : existingProfile['createdAt'] ?? serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        ),
      ]),
      'Não foi possível gravar o perfil de cuidador. Verifique a ligação e tente novamente.',
    );

    return uid;
  }

  async updateUserProfilePhoto(profilePhotoUpload: UserProfilePhotoUpload): Promise<UserProfilePhoto> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new FirebaseError('auth/requires-recent-login', 'É necessário iniciar sessão para alterar a foto de perfil.');
    }

    const profilePhoto = await this.uploadUserProfilePhoto(user.uid, profilePhotoUpload);
    await Promise.all([
      updateProfile(user, { photoURL: profilePhoto.downloadUrl }),
      setDoc(
        doc(firestoreDb, 'users', user.uid),
        {
          uid: user.uid,
          profilePhoto,
          profilePhotoName: profilePhoto.fileName,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
    ]);

    return profilePhoto;
  }

  private async uploadUserProfilePhoto(
    uid: string,
    profilePhotoUpload: UserProfilePhotoUpload,
  ): Promise<UserProfilePhoto> {
    const storagePath = `users/${uid}/profile/profile.jpg`;
    const storageRef = ref(firebaseStorage, storagePath);
    const snapshot = await uploadBytes(storageRef, profilePhotoUpload.blob, {
      contentType: profilePhotoUpload.contentType,
      customMetadata: {
        ownerUid: uid,
        usage: 'profilePhoto',
      },
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);

    return {
      storagePath: snapshot.metadata.fullPath,
      downloadUrl,
      fileName: profilePhotoUpload.name,
      contentType: profilePhotoUpload.contentType,
      originalSize: profilePhotoUpload.originalSize,
      compressedSize: profilePhotoUpload.compressedSize,
      uploadedAt: new Date().toISOString(),
    };
  }

  hasCompletePersonalData(account: UserAccount | null): account is UserAccount {
    return this.getMissingPersonalDataFields(account).length === 0;
  }

  getMissingPersonalDataFields(account: UserAccount | null): string[] {
    const fields = [
      { value: account?.fullName, label: 'Nome completo' },
      { value: account?.birthDate, label: 'Data de nascimento' },
      { value: account?.gender, label: 'Sexo' },
      { value: account?.nationality, label: 'Nacionalidade' },
      { value: account?.phone, label: 'Telemóvel' },
      { value: account?.acceptedTerms, label: 'Aceitação dos Termos e Condições' },
      { value: account?.acceptedPrivacy, label: 'Aceitação da Política de Privacidade' },
      { value: account?.private?.nif, label: 'NIF' },
      { value: account?.private?.documentType, label: 'Tipo de documento' },
      { value: account?.private?.idDocument, label: 'Documento de identificação' },
      { value: account?.private?.postalCode, label: 'Código Postal' },
      { value: account?.location?.district, label: 'Distrito' },
      { value: account?.location?.county, label: 'Concelho' },
    ];

    return fields
      .filter((field) => field.value !== true && (typeof field.value !== 'string' || !field.value.trim()))
      .map((field) => field.label);
  }

  private withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
    let timeoutId: number | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => {
        reject(new FirebaseError('deadline-exceeded', message));
      }, FIREBASE_OPERATION_TIMEOUT_MS);
    });

    return Promise.race([promise, timeout]).finally(() => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    });
  }

  private async sendEmailVerificationMessage(user: User): Promise<void> {
    if (user.emailVerified) {
      return;
    }

    await sendEmailVerification(user, {
      url: `${window.location.origin}/verificar-email`,
      handleCodeInApp: false,
    });
  }

  private async syncEmailVerificationStatus(user: User): Promise<void> {
    const userRef = doc(firestoreDb, 'users', user.uid);
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) {
      return;
    }

    await setDoc(
      userRef,
      {
        uid: user.uid,
        emailVerified: user.emailVerified,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  private async uploadCaregiverTrainingCertificates(
    uid: string,
    items: CaregiverRegistration['training']['items'],
  ): Promise<Array<Omit<CaregiverRegistration['training']['items'][number], 'certificateUpload'>>> {
    return Promise.all(
      items.map(async (item) => {
        const { certificateUpload, ...persistedItem } = item;
        if (!certificateUpload) {
          return persistedItem;
        }

        const storagePath = `caregivers/${uid}/certificates/${item.id}.jpg`;
        const storageRef = ref(firebaseStorage, storagePath);
        const snapshot = await uploadBytes(storageRef, certificateUpload.blob, {
          contentType: certificateUpload.contentType,
          customMetadata: {
            ownerUid: uid,
            trainingType: item.trainingType,
          },
        });

        return {
          ...persistedItem,
          certificateFileName: certificateUpload.name,
          certificate: {
            storagePath: snapshot.metadata.fullPath,
            fileName: certificateUpload.name,
            contentType: certificateUpload.contentType,
            originalSize: certificateUpload.originalSize,
            compressedSize: certificateUpload.compressedSize,
            uploadedAt: new Date().toISOString(),
            status: 'pending' as const,
          },
        };
      }),
    );
  }

  private toApprovalStatus(value: unknown): CaregiverApprovalStatus {
    if (value === 'analysing' || value === 'analysinig') {
      return 'analysing';
    }

    if (value === 'done' || value === 'Done' || value === 'approved') {
      return 'approved';
    }

    if (value === 'rejected' || value === 'refused' || value === 'recusado') {
      return 'rejected';
    }

    return 'pending';
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

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private formatDate(date: Date | null): string {
    if (!date) {
      return '';
    }

    return new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  getFirebaseErrorMessage(error: unknown): string {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          return 'Este email já está associado a uma conta.';
        case 'auth/invalid-email':
          return 'O email informado não é válido.';
        case 'auth/weak-password':
          return 'A palavra-passe deve ter pelo menos 6 caracteres.';
        case 'auth/requires-recent-login':
          return 'É necessário iniciar sessão para continuar.';
        case 'auth/too-many-requests':
          return 'Foram feitas muitas tentativas. Aguarde alguns minutos e tente novamente.';
        case 'deadline-exceeded':
          return error.message || 'A operação demorou demasiado tempo. Verifique a ligação e tente novamente.';
        case 'failed-precondition':
          return error.message || 'Complete os seus dados pessoais antes de continuar.';
        case 'permission-denied':
          return error.message || 'Não foi possível gravar no Firestore. Verifique as regras de segurança.';
        default:
          return error.message;
      }
    }

    return 'Não foi possível concluir o cadastro. Tente novamente.';
  }
}
