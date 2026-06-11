import { Injectable } from '@angular/core';
import { FirebaseError } from 'firebase/app';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { firebaseAuth, firestoreDb } from '../firebase/firebase.config';

export interface CaregiverRegistration {
  account: {
    email: string;
    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
  };
  personal: {
    fullName: string;
    birthDate: string;
    gender: string;
    nationality: string;
    phone: string;
    profilePhotoName: string;
    profilePhoto: {
      name: string;
      type: string;
      size: number;
      base64: string;
    } | null;
    private: {
      nif: string;
      idDocument: string;
    };
  };
  location: {
    district: string;
    county: string;
    postalCode: string;
    travelRadius: string;
    private: {
      address: string;
    };
  };
  professional: {
    summary: string;
    experienceYears: number;
    serviceTypes: string[];
  };
  training: {
    trainingTypes: string[];
    courseName: string;
    trainingEntity: string;
    completionYear: number | null;
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
  };
  reference: {
    name: string;
    contact: string;
    relation: string;
  };
}

export interface UserAccount {
  uid: string;
  email: string;
  fullName: string;
  role?: 'caregiver' | 'family';
  roles?: {
    caregiver?: boolean;
    family?: boolean;
  };
  caregiverProfileStatus?: string;
  familyProfileStatus?: string;
}

export type CaregiverProfileDocument = Record<string, unknown>;

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
    email: string;
    password: string;
  }): Promise<User> {
    const credential = await createUserWithEmailAndPassword(firebaseAuth, data.email, data.password);
    await updateProfile(credential.user, { displayName: data.fullName });

    await setDoc(doc(firestoreDb, 'users', credential.user.uid), {
      uid: credential.user.uid,
      email: data.email,
      fullName: data.fullName,
      role: data.accountType === 'Cuidador' ? 'caregiver' : 'family',
      roles: {
        caregiver: data.accountType === 'Cuidador',
        family: data.accountType !== 'Cuidador',
      },
      caregiverProfileStatus: data.accountType === 'Cuidador' ? 'pending' : null,
      familyProfileStatus: data.accountType === 'Cuidador' ? null : 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return credential.user;
  }

  async signIn(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
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

    if (caregiverStatus === 'active' || caregiverStatus === 'completed') {
      return '/dashboard/cuidador';
    }

    if (caregiverStatus === 'draft') {
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
    await updateProfile(user, { displayName: data.personal.fullName });

    await Promise.all([
      setDoc(
        doc(firestoreDb, 'users', uid),
        {
          uid,
          email: user.email ?? data.account.email,
          fullName: data.personal.fullName,
          role: 'caregiver',
          roles: {
            caregiver: true,
          },
          caregiverProfileStatus: 'draft',
          acceptedTerms: data.account.acceptedTerms,
          acceptedPrivacy: data.account.acceptedPrivacy,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      ),
      setDoc(doc(firestoreDb, 'caregivers', uid), {
        uid,
        status: 'draft',
        publicProfile: {
          fullName: data.personal.fullName,
          gender: data.personal.gender,
          nationality: data.personal.nationality,
          district: data.location.district,
          county: data.location.county,
          travelRadius: data.location.travelRadius,
          summary: data.professional.summary,
          experienceYears: data.professional.experienceYears,
          serviceTypes: data.professional.serviceTypes,
          trainingTypes: data.training.trainingTypes,
          availability: data.availability,
          rates: data.rates,
          skills: data.skills,
          languages: data.languages,
          mobility: data.mobility,
          profilePhotoName: data.personal.profilePhotoName,
          profilePhoto: data.personal.profilePhoto,
        },
        private: {
          birthDate: data.personal.birthDate,
          phone: data.personal.phone,
          nif: data.personal.private.nif,
          idDocument: data.personal.private.idDocument,
          address: data.location.private.address,
          postalCode: data.location.postalCode,
          training: {
            courseName: data.training.courseName,
            trainingEntity: data.training.trainingEntity,
            completionYear: data.training.completionYear,
          },
          reference: data.reference,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    ]);

    return uid;
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
          return 'É necessário iniciar sessão para criar o perfil de cuidador.';
        case 'permission-denied':
          return 'Não foi possível gravar no Firestore. Verifique as regras de segurança.';
        default:
          return error.message;
      }
    }

    return 'Não foi possível concluir o cadastro. Tente novamente.';
  }
}
