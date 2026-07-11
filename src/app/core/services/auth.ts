import { Injectable } from '@angular/core';
import { FirebaseError } from 'firebase/app';
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { firebaseAuth, firebaseStorage, firestoreDb } from '../firebase/firebase.config';

const FIREBASE_OPERATION_TIMEOUT_MS = 20000;

export type UserPrivateDocumentKind =
  | 'identityFront'
  | 'identityBack'
  | 'addressProof'
  | 'criminalRecordCertificate';

export interface UserPrivateDocument {
  storagePath: string;
  downloadUrl: string;
  fileName: string;
  contentType: string;
  originalSize: number;
  compressedSize: number;
  uploadedAt: string;
}

export interface UserPrivateDocumentUpload {
  name: string;
  contentType: string;
  originalSize: number;
  compressedSize: number;
  blob: Blob;
}

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

export interface FamilyRegistration {
  householdName: string;
  relationToCareRecipient: string;
  members: {
    name: string;
    email: string;
    relation: string;
    invite: boolean;
  }[];
  careRecipients: {
    count: number;
    ageGroups: string[];
    notes: string;
  };
  careNeeds: {
    services: string[];
    customService: string;
    weekDays: string[];
    periods: string[];
    description: string;
    schedule: string;
    preferredCareType: string;
  };
  budget: {
    amount: number;
    period: string;
  };
  location: {
    postalCode: string;
    address: string;
    district: string;
    county: string;
    notes: string;
  };
  home: {
    type: string;
    accessibility: string[];
    pets: boolean;
    notes: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    phoneCountry: string;
    phoneCallingCode: string;
    phoneNational: string;
    relation: string;
  };
  automaticMatchConsent: boolean;
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
    criminalRecordNoPending: boolean;
    documents?: Partial<Record<UserPrivateDocumentKind, UserPrivateDocument>>;
    documentUploads?: Partial<Record<UserPrivateDocumentKind, UserPrivateDocumentUpload>>;
  };
  location: {
    countryCode: string;
    country: string;
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
    criminalRecordNoPending?: boolean;
    documents?: Partial<Record<UserPrivateDocumentKind, UserPrivateDocument>>;
  };
  location?: {
    countryCode?: string;
    country?: string;
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
  familyProfile?: (FamilyRegistration & {
    completed?: boolean;
    submittedAt?: unknown;
  }) | null;
  profilePhoto?: UserProfilePhoto | null;
  profilePhotoName?: string;
  photoURL?: string;
  photoProvider?: 'google';
  emailVerified?: boolean;
}

export type CaregiverProfileDocument = Record<string, unknown>;

export type CaregiverApprovalStatus = 'pending' | 'analysing' | 'approved' | 'rejected';
export type FirebaseErrorContext = 'login' | 'register' | 'read' | 'save' | 'upload' | 'admin' | 'email';

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
      familyProfileStatus: data.accountType === 'Cuidador' ? null : 'draft',
      familyReview:
        data.accountType === 'Cuidador'
          ? null
          : {
              status: 'draft',
              requestedAt: null,
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

  async completeGoogleAccount(data: {
    accountType: string;
    fullName: string;
    birthDate: string;
    nif: string;
    documentType: string;
    idDocument: string;
  }): Promise<User> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new FirebaseError('auth/requires-recent-login', 'É necessário iniciar sessão com Google para completar o cadastro.');
    }

    await updateProfile(user, { displayName: data.fullName });
    await setDoc(
      doc(firestoreDb, 'users', user.uid),
      {
        uid: user.uid,
        email: user.email ?? '',
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
        familyProfileStatus: data.accountType === 'Cuidador' ? null : 'draft',
        familyReview:
          data.accountType === 'Cuidador'
            ? null
            : {
                status: 'draft',
                requestedAt: null,
                lockedBy: null,
                lockedAt: null,
                decidedBy: null,
                decidedAt: null,
                rejectionReason: null,
        },
        photoURL: user.photoURL ?? '',
        photoProvider: user.photoURL ? 'google' : null,
        emailVerified: user.emailVerified,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return user;
  }

  async signIn(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    await this.syncEmailVerificationStatus(credential.user);
    return credential.user;
  }

  async signInWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(firebaseAuth, provider);
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

  async getCaregivers(): Promise<CaregiverProfileDocument[]> {
    const snapshot = await this.withTimeout(
      getDocs(collection(firestoreDb, 'caregivers')),
      'Não foi possível carregar os cuidadores. Verifique a ligação e tente novamente.',
    );

    return Promise.all(snapshot.docs.map(async (caregiverDoc) => {
      const uid = caregiverDoc.id;

      const caregiverData = caregiverDoc.data();
      const storagePhotoUrl = await this.getPublicProfilePhotoUrl(uid);

      return {
        uid,
        ...caregiverData,
        photoURL: storagePhotoUrl || (typeof caregiverData['photoURL'] === 'string' ? caregiverData['photoURL'] : ''),
      };
    }));
  }

  private async getPublicProfilePhotoUrl(uid: string): Promise<string> {
    try {
      return await getDownloadURL(ref(firebaseStorage, `users/${uid}/profile/profile.jpg`));
    } catch {
      return '';
    }
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

    const existingAccount = await this.getUserAccount(user.uid);
    const documents = await this.uploadUserPrivateDocuments(
      user.uid,
      data.private.documents ?? existingAccount?.private?.documents ?? {},
      data.private.documentUploads ?? {},
    );
    const { documentUploads: _documentUploads, ...privateData } = data.private;

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
          private: {
            ...privateData,
            documents,
          },
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

  async registerFamily(data: FamilyRegistration): Promise<string> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new FirebaseError('auth/requires-recent-login', 'É necessário iniciar sessão para criar o cadastro de família.');
    }

    const uid = user.uid;
    const account = await this.getUserAccount(uid);
    if (!this.hasCompletePersonalData(account)) {
      throw new FirebaseError(
        'failed-precondition',
        'Complete os seus dados pessoais antes de criar ou atualizar o cadastro de família.',
      );
    }

    if (!this.isAdult(account.birthDate)) {
      throw new FirebaseError(
        'failed-precondition',
        'É necessário ser maior de idade para cadastrar uma família.',
      );
    }

    await this.withTimeout(
      setDoc(
        doc(firestoreDb, 'users', uid),
        {
          uid,
          email: user.email ?? account.email,
          role: 'family',
          roles: {
            family: true,
          },
          familyProfileStatus: 'approved',
          familyProfile: {
            ...data,
            completed: true,
            submittedAt: serverTimestamp(),
          },
          familyReview: {
            status: 'approved',
            requestedAt: serverTimestamp(),
            lockedBy: null,
            lockedAt: null,
            decidedBy: 'automatic',
            decidedAt: serverTimestamp(),
            rejectionReason: null,
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
      'Não foi possível gravar o cadastro de família. Verifique a ligação e tente novamente.',
    );

    return uid;
  }

  async inviteFamilyMember(member: FamilyRegistration['members'][number]): Promise<void> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new FirebaseError('auth/requires-recent-login', 'É necessário iniciar sessão para convidar familiares.');
    }

    const account = await this.getUserAccount(user.uid);
    if (!account?.familyProfile) {
      throw new FirebaseError(
        'failed-precondition',
        'Complete o cadastro da família antes de convidar familiares.',
      );
    }

    const members = account.familyProfile.members ?? [];
    const alreadyInvited = members.some(
      (existingMember) => existingMember.email.toLowerCase() === member.email.toLowerCase(),
    );

    if (alreadyInvited) {
      throw new FirebaseError('already-exists', 'Este email já está associado a esta família.');
    }

    await this.withTimeout(
      setDoc(
        doc(firestoreDb, 'users', user.uid),
        {
          familyProfile: {
            ...account.familyProfile,
            members: [...members, member],
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
      'Não foi possível enviar o convite. Verifique a ligação e tente novamente.',
    );
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
    const publicPhotoUrl = account.profilePhoto?.downloadUrl || account.photoURL || user.photoURL || '';
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
            photoURL: publicPhotoUrl,
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
              photoUrl: publicPhotoUrl,
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

  private async uploadUserPrivateDocuments(
    uid: string,
    existingDocuments: Partial<Record<UserPrivateDocumentKind, UserPrivateDocument>>,
    uploads: Partial<Record<UserPrivateDocumentKind, UserPrivateDocumentUpload>>,
  ): Promise<Partial<Record<UserPrivateDocumentKind, UserPrivateDocument>>> {
    const entries = await Promise.all(
      (Object.entries(uploads) as Array<[UserPrivateDocumentKind, UserPrivateDocumentUpload | undefined]>)
        .filter((entry): entry is [UserPrivateDocumentKind, UserPrivateDocumentUpload] => !!entry[1])
        .map(async ([kind, upload]) => {
          const document = await this.uploadUserPrivateDocument(uid, kind, upload);
          return [kind, document] as const;
        }),
    );

    return {
      ...existingDocuments,
      ...Object.fromEntries(entries),
    };
  }

  private async uploadUserPrivateDocument(
    uid: string,
    kind: UserPrivateDocumentKind,
    upload: UserPrivateDocumentUpload,
  ): Promise<UserPrivateDocument> {
    const storagePath = `users/${uid}/documents/${kind}.jpg`;
    const storageRef = ref(firebaseStorage, storagePath);
    const snapshot = await uploadBytes(storageRef, upload.blob, {
      contentType: upload.contentType,
      customMetadata: {
        ownerUid: uid,
        documentKind: kind,
      },
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);

    return {
      storagePath: snapshot.metadata.fullPath,
      downloadUrl,
      fileName: upload.name,
      contentType: upload.contentType,
      originalSize: upload.originalSize,
      compressedSize: upload.compressedSize,
      uploadedAt: new Date().toISOString(),
    };
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
    const documents = account?.private?.documents ?? {};
    const isFamilyAccount = account?.roles?.family === true || account?.role === 'family';
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
      { value: account?.location?.countryCode ?? (account?.location ? 'PT' : ''), label: 'País' },
      { value: account?.location?.district, label: 'Distrito' },
      { value: account?.location?.county, label: 'Concelho' },
    ];

    if (!isFamilyAccount) {
      fields.splice(
        11,
        0,
        { value: account?.private?.criminalRecordNoPending, label: 'Declaração de inexistência de pendência criminal' },
        { value: documents.identityFront?.storagePath, label: 'Foto da frente do documento' },
        {
          value: account?.private?.documentType === 'Passaporte' ? true : documents.identityBack?.storagePath,
          label: 'Foto do verso do documento',
        },
      );
      fields.push(
        { value: documents.addressProof?.storagePath, label: 'Foto do comprovativo de morada' },
        { value: documents.criminalRecordCertificate?.storagePath, label: 'Foto do atestado de criminalidade' },
      );
    }

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

  private isAdult(birthDate: string | undefined): boolean {
    if (!birthDate) {
      return false;
    }

    const parsedBirthDate = new Date(`${birthDate}T00:00:00`);
    if (Number.isNaN(parsedBirthDate.getTime())) {
      return false;
    }

    const today = new Date();
    const eighteenthBirthday = new Date(parsedBirthDate);
    eighteenthBirthday.setFullYear(parsedBirthDate.getFullYear() + 18);
    return eighteenthBirthday <= today;
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

  getFirebaseErrorMessage(error: unknown, context?: FirebaseErrorContext): string {
    if (error instanceof FirebaseError) {
      return this.firebaseErrorMessages(context)[error.code] ?? this.fallbackFirebaseErrorMessage(error, context);
    }

    return this.fallbackContextMessage(context);
  }

  private firebaseErrorMessages(context?: FirebaseErrorContext): Record<string, string> {
    return {
      'auth/email-already-in-use': 'Este email já está associado a uma conta. Inicie sessão ou use outro email.',
      'auth/invalid-email': 'O email informado não é válido. Verifique e tente novamente.',
      'auth/weak-password': 'A palavra-passe deve ter pelo menos 6 caracteres.',
      'auth/user-not-found': 'Não encontrámos uma conta com este email.',
      'auth/wrong-password': 'A palavra-passe está incorreta.',
      'auth/invalid-credential': 'Email ou palavra-passe incorretos. Verifique os dados e tente novamente.',
      'auth/user-disabled': 'Esta conta está desativada. Contacte o suporte.',
      'auth/too-many-requests': 'Foram feitas muitas tentativas. Aguarde alguns minutos e tente novamente.',
      'auth/requires-recent-login': 'Por segurança, inicie sessão novamente para continuar.',
      'auth/network-request-failed': 'Não foi possível ligar ao serviço. Verifique a internet e tente novamente.',
      'auth/unauthorized-domain': 'Este domínio não está autorizado para autenticação. Contacte o suporte.',
      'auth/operation-not-allowed': 'O início de sessão com Google ainda não está ativo no Firebase. Ative o provedor Google em Authentication > Sign-in method.',
      'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de concluir o início de sessão.',
      'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Permita pop-ups para continuar.',
      'auth/cancelled-popup-request': 'Já existe uma janela de autenticação aberta. Feche-a e tente novamente.',
      'auth/account-exists-with-different-credential': 'Este email já existe com outro método de início de sessão.',
      'auth/web-storage-unsupported': 'O navegador bloqueou o armazenamento necessário para autenticação. Ative cookies/armazenamento local e tente novamente.',
      unauthenticated: 'A sua sessão expirou. Inicie sessão novamente.',
      'permission-denied': this.permissionDeniedMessage(context),
      'not-found': 'Não encontrámos a informação solicitada.',
      'already-exists': 'Esta informação já existe. Verifique os dados e tente novamente.',
      'failed-precondition': 'Ainda falta concluir uma etapa obrigatória antes de continuar.',
      'invalid-argument': 'Alguns dados enviados não estão válidos. Reveja o formulário.',
      'deadline-exceeded': 'A operação demorou demasiado tempo. Tente novamente.',
      unavailable: 'O serviço está temporariamente indisponível. Tente novamente em instantes.',
      'resource-exhausted': 'O serviço atingiu um limite temporário. Tente novamente mais tarde.',
      cancelled: 'A operação foi cancelada. Tente novamente.',
      aborted: 'Não foi possível concluir a operação. Tente novamente.',
      'storage/unauthorized': 'Não tem permissão para enviar ou ver este ficheiro.',
      'storage/unauthenticated': 'Inicie sessão novamente para enviar ficheiros.',
      'storage/canceled': 'O envio do ficheiro foi cancelado.',
      'storage/object-not-found': 'O ficheiro solicitado não foi encontrado.',
      'storage/quota-exceeded': 'O limite de armazenamento foi atingido. Tente novamente mais tarde.',
      'storage/retry-limit-exceeded': 'Não foi possível enviar o ficheiro após várias tentativas. Verifique a ligação.',
      'storage/invalid-format': 'O formato do ficheiro não é aceite.',
      'storage/unknown': 'Não foi possível processar o ficheiro. Tente novamente.',
    };
  }

  private permissionDeniedMessage(context?: FirebaseErrorContext): string {
    if (context === 'admin') {
      return 'Não tem permissão para aceder a esta área.';
    }
    if (context === 'read') {
      return 'Não foi possível carregar esta informação. Verifique se tem permissão e tente novamente.';
    }
    if (context === 'save') {
      return 'Não foi possível guardar os dados. Verifique se tem permissão e tente novamente.';
    }
    if (context === 'upload') {
      return 'Não tem permissão para enviar este ficheiro.';
    }
    return 'Não tem permissão para aceder ou alterar esta informação.';
  }

  private fallbackFirebaseErrorMessage(error: FirebaseError, context?: FirebaseErrorContext): string {
    if (error.message && !error.message.includes('Firebase')) {
      return error.message;
    }

    return this.fallbackContextMessage(context);
  }

  private fallbackContextMessage(context?: FirebaseErrorContext): string {
    switch (context) {
      case 'login':
        return 'Não foi possível iniciar sessão. Verifique os dados e tente novamente.';
      case 'register':
        return 'Não foi possível criar a conta. Tente novamente.';
      case 'read':
        return 'Não foi possível carregar a informação. Tente novamente.';
      case 'save':
        return 'Não foi possível guardar os dados. Tente novamente.';
      case 'upload':
        return 'Não foi possível enviar o ficheiro. Tente novamente.';
      case 'admin':
        return 'Não foi possível concluir a operação administrativa. Tente novamente.';
      case 'email':
        return 'Não foi possível validar o email. Tente novamente.';
      default:
        return 'Não foi possível concluir a operação. Tente novamente.';
    }
  }
}
