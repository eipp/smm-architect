"use client"

import { useRouter } from 'next/navigation'
import { useState, useEffect, createContext, useContext } from 'react'

// Translation key types for type safety
interface TranslationKeys {
  // Canvas & Workflow
  'canvas.step.discover': string
  'canvas.step.plan': string
  'canvas.step.draft': string
  'canvas.step.verify': string
  'canvas.step.approve': string
  'canvas.step.post': string
  'canvas.action.fix': string
  'canvas.action.rerun': string
  'canvas.action.approve': string
  'canvas.action.rollback': string
  'canvas.status.running': string
  'canvas.status.completed': string
  'canvas.status.failed': string
  'canvas.status.pending': string
  
  // Decision Cards
  'decision.risk.low': string
  'decision.risk.medium': string
  'decision.risk.high': string
  'decision.action.approve': string
  'decision.action.request_edits': string
  'decision.action.escalate': string
  'decision.readiness_score': string
  'decision.estimated_cost': string
  'decision.policy_compliance': string
  'decision.citation_coverage': string
  'decision.expires_in': string
  'decision.expired': string
  
  // Auto Setup Flow
  'onboard.welcome.title': string
  'onboard.welcome.subtitle': string
  'onboard.workspace.name_label': string
  'onboard.workspace.name_placeholder': string
  'onboard.workspace.channel_label': string
  'onboard.oauth.connect_button': string
  'onboard.oauth.connection_success': string
  'onboard.oauth.connection_failed': string
  'onboard.shadow_run.title': string
  'onboard.shadow_run.description': string
  'onboard.complete.button': string
  
  // Settings & Admin
  'settings.personas.title': string
  'settings.personas.add_new': string
  'settings.personas.edit': string
  'settings.personas.delete': string
  'settings.budget.weekly_cap': string
  'settings.budget.hard_cap': string
  'settings.budget.current_usage': string
  'settings.policy.title': string
  'settings.policy.compliance_required': string
  'settings.emergency.pause_all': string
  'settings.emergency.resume_all': string
  
  // Navigation
  'nav.dashboard': string
  'nav.auto_setup': string
  'nav.canvas': string
  'nav.chat': string
  'nav.calendar': string
  'nav.connectors': string
  'nav.settings': string
  'nav.audit': string
  
  // Authentication
  'auth.login.title': string
  'auth.login.email_label': string
  'auth.login.password_label': string
  'auth.login.submit_button': string
  'auth.login.forgot_password': string
  'auth.logout.button': string
  'auth.permissions.insufficient': string
  
  // Common UI
  'common.loading': string
  'common.error': string
  'common.retry': string
  'common.cancel': string
  'common.save': string
  'common.edit': string
  'common.delete': string
  'common.confirm': string
  'common.back': string
  'common.next': string
  'common.continue': string
  'common.close': string
  'common.search': string
  'common.filter': string
  
  // Time & Dates
  'time.now': string
  'time.minutes_ago': string
  'time.hours_ago': string
  'time.days_ago': string
  'time.yesterday': string
  'time.today': string
  'time.tomorrow': string
  
  // Validation
  'validation.required': string
  'validation.email_invalid': string
  'validation.password_weak': string
  'validation.name_too_short': string
  'validation.budget_invalid': string
  
  // Notifications
  'notification.success': string
  'notification.error': string
  'notification.warning': string
  'notification.info': string
  'notification.workspace_created': string
  'notification.campaign_approved': string
  'notification.budget_exceeded': string
}

type TranslationFunction = (key: keyof TranslationKeys, params?: Record<string, string | number>) => string

// Translation context
interface I18nContextValue {
  locale: string
  setLocale: (locale: string) => void
  t: TranslationFunction
  isLoading: boolean
}

const I18nContext = createContext<I18nContextValue | null>(null)

// Supported locales
export const SUPPORTED_LOCALES = {
  en: 'English',
  es: 'Español', 
  fr: 'Français',
  de: 'Deutsch',
  ja: '日本語',
  zh: '中文'
} as const

export type SupportedLocale = keyof typeof SUPPORTED_LOCALES

// Translation storage
const translations: Record<SupportedLocale, TranslationKeys> = {
  en: {
    // Canvas & Workflow
    'canvas.step.discover': 'Discover',
    'canvas.step.plan': 'Plan',
    'canvas.step.draft': 'Draft',
    'canvas.step.verify': 'Verify',
    'canvas.step.approve': 'Approve',
    'canvas.step.post': 'Post',
    'canvas.action.fix': 'Fix',
    'canvas.action.rerun': 'Rerun',
    'canvas.action.approve': 'Approve',
    'canvas.action.rollback': 'Rollback',
    'canvas.status.running': 'Running',
    'canvas.status.completed': 'Completed',
    'canvas.status.failed': 'Failed',
    'canvas.status.pending': 'Pending',
    
    // Decision Cards
    'decision.risk.low': 'Low Risk',
    'decision.risk.medium': 'Medium Risk',
    'decision.risk.high': 'High Risk',
    'decision.action.approve': 'Approve',
    'decision.action.request_edits': 'Request Edits',
    'decision.action.escalate': 'Escalate',
    'decision.readiness_score': 'Readiness Score',
    'decision.estimated_cost': 'Estimated Cost',
    'decision.policy_compliance': 'Policy Compliance',
    'decision.citation_coverage': 'Citation Coverage',
    'decision.expires_in': 'Expires in {{hours}}h',
    'decision.expired': 'Expired',
    
    // Auto Setup
    'onboard.welcome.title': 'Welcome to SMM Architect',
    'onboard.welcome.subtitle': 'Set up your first workspace in minutes',
    'onboard.workspace.name_label': 'Workspace Name',
    'onboard.workspace.name_placeholder': 'Enter workspace name...',
    'onboard.workspace.channel_label': 'Primary Channel',
    'onboard.oauth.connect_button': 'Connect {{platform}}',
    'onboard.oauth.connection_success': 'Successfully connected to {{platform}}',
    'onboard.oauth.connection_failed': 'Failed to connect to {{platform}}',
    'onboard.shadow_run.title': 'Shadow Run Results',
    'onboard.shadow_run.description': 'Preview of your workspace performance',
    'onboard.complete.button': 'Complete Setup',
    
    // Settings
    'settings.personas.title': 'Brand Personas',
    'settings.personas.add_new': 'Add New Persona',
    'settings.personas.edit': 'Edit Persona',
    'settings.personas.delete': 'Delete Persona',
    'settings.budget.weekly_cap': 'Weekly Budget Cap',
    'settings.budget.hard_cap': 'Hard Limit',
    'settings.budget.current_usage': 'Current Usage: {{amount}}',
    'settings.policy.title': 'Policy Configuration',
    'settings.policy.compliance_required': 'Compliance Required',
    'settings.emergency.pause_all': 'Emergency Pause All',
    'settings.emergency.resume_all': 'Resume All',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.auto_setup': 'Auto Setup',
    'nav.canvas': 'Canvas',
    'nav.chat': 'Chat',
    'nav.calendar': 'Calendar',
    'nav.connectors': 'Connectors',
    'nav.settings': 'Settings',
    'nav.audit': 'Audit',
    
    // Authentication
    'auth.login.title': 'Sign In',
    'auth.login.email_label': 'Email Address',
    'auth.login.password_label': 'Password',
    'auth.login.submit_button': 'Sign In',
    'auth.login.forgot_password': 'Forgot Password?',
    'auth.logout.button': 'Sign Out',
    'auth.permissions.insufficient': 'Insufficient permissions to access this resource',
    
    // Common UI
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.retry': 'Retry',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.continue': 'Continue',
    'common.close': 'Close',
    'common.search': 'Search',
    'common.filter': 'Filter',
    
    // Time & Dates
    'time.now': 'now',
    'time.minutes_ago': '{{count}} minutes ago',
    'time.hours_ago': '{{count}} hours ago',
    'time.days_ago': '{{count}} days ago',
    'time.yesterday': 'yesterday',
    'time.today': 'today',
    'time.tomorrow': 'tomorrow',
    
    // Validation
    'validation.required': 'This field is required',
    'validation.email_invalid': 'Please enter a valid email address',
    'validation.password_weak': 'Password must be at least 8 characters',
    'validation.name_too_short': 'Name must be at least 3 characters',
    'validation.budget_invalid': 'Please enter a valid budget amount',
    
    // Notifications
    'notification.success': 'Success',
    'notification.error': 'Error',
    'notification.warning': 'Warning',
    'notification.info': 'Information',
    'notification.workspace_created': 'Workspace created successfully',
    'notification.campaign_approved': 'Campaign approved and scheduled',
    'notification.budget_exceeded': 'Budget limit exceeded'
  },
  es: {
    // Canvas & Workflow
    'canvas.step.discover': 'Descubrir',
    'canvas.step.plan': 'Planificar',
    'canvas.step.draft': 'Borrador',
    'canvas.step.verify': 'Verificar',
    'canvas.step.approve': 'Aprobar',
    'canvas.step.post': 'Publicar',
    'canvas.action.fix': 'Arreglar',
    'canvas.action.rerun': 'Volver a ejecutar',
    'canvas.action.approve': 'Aprobar',
    'canvas.action.rollback': 'Revertir',
    'canvas.status.running': 'Ejecutándose',
    'canvas.status.completed': 'Completado',
    'canvas.status.failed': 'Fallido',
    'canvas.status.pending': 'Pendiente',
    
    // Decision Cards
    'decision.risk.low': 'Riesgo Bajo',
    'decision.risk.medium': 'Riesgo Medio',
    'decision.risk.high': 'Riesgo Alto',
    'decision.action.approve': 'Aprobar',
    'decision.action.request_edits': 'Solicitar Ediciones',
    'decision.action.escalate': 'Escalar',
    'decision.readiness_score': 'Puntuación de Preparación',
    'decision.estimated_cost': 'Costo Estimado',
    'decision.policy_compliance': 'Cumplimiento de Políticas',
    'decision.citation_coverage': 'Cobertura de Citas',
    'decision.expires_in': 'Expira en {{hours}}h',
    'decision.expired': 'Expirado',
    
    // Auto Setup
    'onboard.welcome.title': 'Bienvenido a SMM Architect',
    'onboard.welcome.subtitle': 'Configura tu primer espacio de trabajo en minutos',
    'onboard.workspace.name_label': 'Nombre del Espacio de Trabajo',
    'onboard.workspace.name_placeholder': 'Ingresa el nombre del espacio...',
    'onboard.workspace.channel_label': 'Canal Principal',
    'onboard.oauth.connect_button': 'Conectar {{platform}}',
    'onboard.oauth.connection_success': 'Conectado exitosamente a {{platform}}',
    'onboard.oauth.connection_failed': 'Error al conectar con {{platform}}',
    'onboard.shadow_run.title': 'Resultados de Ejecución de Prueba',
    'onboard.shadow_run.description': 'Vista previa del rendimiento de tu espacio de trabajo',
    'onboard.complete.button': 'Completar Configuración',
    
    // Settings
    'settings.personas.title': 'Personas de Marca',
    'settings.personas.add_new': 'Agregar Nueva Persona',
    'settings.personas.edit': 'Editar Persona',
    'settings.personas.delete': 'Eliminar Persona',
    'settings.budget.weekly_cap': 'Límite Presupuestario Semanal',
    'settings.budget.hard_cap': 'Límite Absoluto',
    'settings.budget.current_usage': 'Uso Actual: {{amount}}',
    'settings.policy.title': 'Configuración de Políticas',
    'settings.policy.compliance_required': 'Cumplimiento Requerido',
    'settings.emergency.pause_all': 'Pausar Todo de Emergencia',
    'settings.emergency.resume_all': 'Reanudar Todo',
    
    // Navigation
    'nav.dashboard': 'Panel de Control',
    'nav.auto_setup': 'Configuración Automática',
    'nav.canvas': 'Lienzo',
    'nav.chat': 'Chat',
    'nav.calendar': 'Calendario',
    'nav.connectors': 'Conectores',
    'nav.settings': 'Configuración',
    'nav.audit': 'Auditoría',
    
    // Authentication
    'auth.login.title': 'Iniciar Sesión',
    'auth.login.email_label': 'Dirección de Correo',
    'auth.login.password_label': 'Contraseña',
    'auth.login.submit_button': 'Iniciar Sesión',
    'auth.login.forgot_password': '¿Olvidaste tu contraseña?',
    'auth.logout.button': 'Cerrar Sesión',
    'auth.permissions.insufficient': 'Permisos insuficientes para acceder a este recurso',
    
    // Common UI
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.retry': 'Reintentar',
    'common.cancel': 'Cancelar',
    'common.save': 'Guardar',
    'common.edit': 'Editar',
    'common.delete': 'Eliminar',
    'common.confirm': 'Confirmar',
    'common.back': 'Atrás',
    'common.next': 'Siguiente',
    'common.continue': 'Continuar',
    'common.close': 'Cerrar',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    
    // Time & Dates
    'time.now': 'ahora',
    'time.minutes_ago': 'hace {{count}} minutos',
    'time.hours_ago': 'hace {{count}} horas',
    'time.days_ago': 'hace {{count}} días',
    'time.yesterday': 'ayer',
    'time.today': 'hoy',
    'time.tomorrow': 'mañana',
    
    // Validation
    'validation.required': 'Este campo es obligatorio',
    'validation.email_invalid': 'Por favor ingresa una dirección de correo válida',
    'validation.password_weak': 'La contraseña debe tener al menos 8 caracteres',
    'validation.name_too_short': 'El nombre debe tener al menos 3 caracteres',
    'validation.budget_invalid': 'Por favor ingresa un monto presupuestario válido',
    
    // Notifications
    'notification.success': 'Éxito',
    'notification.error': 'Error',
    'notification.warning': 'Advertencia',
    'notification.info': 'Información',
    'notification.workspace_created': 'Espacio de trabajo creado exitosamente',
    'notification.campaign_approved': 'Campaña aprobada y programada',
    'notification.budget_exceeded': 'Límite presupuestario excedido'
  },
  fr: {
    // Canvas & Workflow
    'canvas.step.discover': 'Découvrir',
    'canvas.step.plan': 'Planifier',
    'canvas.step.draft': 'Brouillon',
    'canvas.step.verify': 'Vérifier',
    'canvas.step.approve': 'Approuver',
    'canvas.step.post': 'Publier',
    'canvas.action.fix': 'Corriger',
    'canvas.action.rerun': 'Relancer',
    'canvas.action.approve': 'Approuver',
    'canvas.action.rollback': 'Annuler',
    'canvas.status.running': 'En cours',
    'canvas.status.completed': 'Terminé',
    'canvas.status.failed': 'Échoué',
    'canvas.status.pending': 'En attente',
    
    // Decision Cards
    'decision.risk.low': 'Risque Faible',
    'decision.risk.medium': 'Risque Moyen',
    'decision.risk.high': 'Risque Élevé',
    'decision.action.approve': 'Approuver',
    'decision.action.request_edits': 'Demander des Modifications',
    'decision.action.escalate': 'Escalader',
    'decision.readiness_score': 'Score de Préparation',
    'decision.estimated_cost': 'Coût Estimé',
    'decision.policy_compliance': 'Conformité aux Politiques',
    'decision.citation_coverage': 'Couverture des Citations',
    'decision.expires_in': 'Expire dans {{hours}}h',
    'decision.expired': 'Expiré',
    
    // Auto Setup
    'onboard.welcome.title': 'Bienvenue sur SMM Architect',
    'onboard.welcome.subtitle': 'Configurez votre premier espace de travail en quelques minutes',
    'onboard.workspace.name_label': 'Nom de l\'Espace de Travail',
    'onboard.workspace.name_placeholder': 'Entrez le nom de l\'espace...',
    'onboard.workspace.channel_label': 'Canal Principal',
    'onboard.oauth.connect_button': 'Connecter {{platform}}',
    'onboard.oauth.connection_success': 'Connecté avec succès à {{platform}}',
    'onboard.oauth.connection_failed': 'Échec de la connexion à {{platform}}',
    'onboard.shadow_run.title': 'Résultats d\'Exécution de Test',
    'onboard.shadow_run.description': 'Aperçu des performances de votre espace de travail',
    'onboard.complete.button': 'Terminer la Configuration',
    
    // Settings
    'settings.personas.title': 'Personas de Marque',
    'settings.personas.add_new': 'Ajouter un Nouveau Persona',
    'settings.personas.edit': 'Modifier le Persona',
    'settings.personas.delete': 'Supprimer le Persona',
    'settings.budget.weekly_cap': 'Plafond Budgétaire Hebdomadaire',
    'settings.budget.hard_cap': 'Limite Absolue',
    'settings.budget.current_usage': 'Utilisation Actuelle: {{amount}}',
    'settings.policy.title': 'Configuration des Politiques',
    'settings.policy.compliance_required': 'Conformité Requise',
    'settings.emergency.pause_all': 'Pause d\'Urgence Générale',
    'settings.emergency.resume_all': 'Reprendre Tout',
    
    // Navigation
    'nav.dashboard': 'Tableau de Bord',
    'nav.auto_setup': 'Configuration Automatique',
    'nav.canvas': 'Canevas',
    'nav.chat': 'Chat',
    'nav.calendar': 'Calendrier',
    'nav.connectors': 'Connecteurs',
    'nav.settings': 'Paramètres',
    'nav.audit': 'Audit',
    
    // Authentication
    'auth.login.title': 'Se Connecter',
    'auth.login.email_label': 'Adresse E-mail',
    'auth.login.password_label': 'Mot de Passe',
    'auth.login.submit_button': 'Se Connecter',
    'auth.login.forgot_password': 'Mot de passe oublié?',
    'auth.logout.button': 'Se Déconnecter',
    'auth.permissions.insufficient': 'Permissions insuffisantes pour accéder à cette ressource',
    
    // Common UI
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.retry': 'Réessayer',
    'common.cancel': 'Annuler',
    'common.save': 'Enregistrer',
    'common.edit': 'Modifier',
    'common.delete': 'Supprimer',
    'common.confirm': 'Confirmer',
    'common.back': 'Retour',
    'common.next': 'Suivant',
    'common.continue': 'Continuer',
    'common.close': 'Fermer',
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',
    
    // Time & Dates
    'time.now': 'maintenant',
    'time.minutes_ago': 'il y a {{count}} minutes',
    'time.hours_ago': 'il y a {{count}} heures',
    'time.days_ago': 'il y a {{count}} jours',
    'time.yesterday': 'hier',
    'time.today': 'aujourd\'hui',
    'time.tomorrow': 'demain',
    
    // Validation
    'validation.required': 'Ce champ est obligatoire',
    'validation.email_invalid': 'Veuillez entrer une adresse e-mail valide',
    'validation.password_weak': 'Le mot de passe doit contenir au moins 8 caractères',
    'validation.name_too_short': 'Le nom doit contenir au moins 3 caractères',
    'validation.budget_invalid': 'Veuillez entrer un montant budgétaire valide',
    
    // Notifications
    'notification.success': 'Succès',
    'notification.error': 'Erreur',
    'notification.warning': 'Avertissement',
    'notification.info': 'Information',
    'notification.workspace_created': 'Espace de travail créé avec succès',
    'notification.campaign_approved': 'Campagne approuvée et programmée',
    'notification.budget_exceeded': 'Limite budgétaire dépassée'
  },
  de: {
    // Canvas & Workflow
    'canvas.step.discover': 'Entdecken',
    'canvas.step.plan': 'Planen',
    'canvas.step.draft': 'Entwurf',
    'canvas.step.verify': 'Verifizieren',
    'canvas.step.approve': 'Genehmigen',
    'canvas.step.post': 'Veröffentlichen',
    'canvas.action.fix': 'Reparieren',
    'canvas.action.rerun': 'Erneut ausführen',
    'canvas.action.approve': 'Genehmigen',
    'canvas.action.rollback': 'Rückgängig machen',
    'canvas.status.running': 'Läuft',
    'canvas.status.completed': 'Abgeschlossen',
    'canvas.status.failed': 'Fehlgeschlagen',
    'canvas.status.pending': 'Ausstehend',
    
    // Decision Cards
    'decision.risk.low': 'Geringes Risiko',
    'decision.risk.medium': 'Mittleres Risiko',
    'decision.risk.high': 'Hohes Risiko',
    'decision.action.approve': 'Genehmigen',
    'decision.action.request_edits': 'Bearbeitungen Anfordern',
    'decision.action.escalate': 'Eskalieren',
    'decision.readiness_score': 'Bereitschaftswert',
    'decision.estimated_cost': 'Geschätzte Kosten',
    'decision.policy_compliance': 'Richtlinien-Konformität',
    'decision.citation_coverage': 'Zitat-Abdeckung',
    'decision.expires_in': 'Läuft in {{hours}}h ab',
    'decision.expired': 'Abgelaufen',
    
    // Auto Setup
    'onboard.welcome.title': 'Willkommen bei SMM Architect',
    'onboard.welcome.subtitle': 'Richten Sie Ihren ersten Arbeitsbereich in Minuten ein',
    'onboard.workspace.name_label': 'Arbeitsbereich-Name',
    'onboard.workspace.name_placeholder': 'Arbeitsbereich-Namen eingeben...',
    'onboard.workspace.channel_label': 'Haupt-Kanal',
    'onboard.oauth.connect_button': '{{platform}} Verbinden',
    'onboard.oauth.connection_success': 'Erfolgreich mit {{platform}} verbunden',
    'onboard.oauth.connection_failed': 'Verbindung zu {{platform}} fehlgeschlagen',
    'onboard.shadow_run.title': 'Shadow-Run Ergebnisse',
    'onboard.shadow_run.description': 'Vorschau der Arbeitsbereich-Leistung',
    'onboard.complete.button': 'Einrichtung Abschließen',
    
    // Settings
    'settings.personas.title': 'Marken-Personas',
    'settings.personas.add_new': 'Neue Persona Hinzufügen',
    'settings.personas.edit': 'Persona Bearbeiten',
    'settings.personas.delete': 'Persona Löschen',
    'settings.budget.weekly_cap': 'Wöchentliche Budget-Obergrenze',
    'settings.budget.hard_cap': 'Absolute Grenze',
    'settings.budget.current_usage': 'Aktuelle Nutzung: {{amount}}',
    'settings.policy.title': 'Richtlinien-Konfiguration',
    'settings.policy.compliance_required': 'Konformität Erforderlich',
    'settings.emergency.pause_all': 'Notfall-Pause Alle',
    'settings.emergency.resume_all': 'Alle Fortsetzen',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.auto_setup': 'Auto-Einrichtung',
    'nav.canvas': 'Canvas',
    'nav.chat': 'Chat',
    'nav.calendar': 'Kalender',
    'nav.connectors': 'Konnektoren',
    'nav.settings': 'Einstellungen',
    'nav.audit': 'Audit',
    
    // Authentication
    'auth.login.title': 'Anmelden',
    'auth.login.email_label': 'E-Mail-Adresse',
    'auth.login.password_label': 'Passwort',
    'auth.login.submit_button': 'Anmelden',
    'auth.login.forgot_password': 'Passwort vergessen?',
    'auth.logout.button': 'Abmelden',
    'auth.permissions.insufficient': 'Unzureichende Berechtigungen für diese Ressource',
    
    // Common UI
    'common.loading': 'Laden...',
    'common.error': 'Fehler',
    'common.retry': 'Wiederholen',
    'common.cancel': 'Abbrechen',
    'common.save': 'Speichern',
    'common.edit': 'Bearbeiten',
    'common.delete': 'Löschen',
    'common.confirm': 'Bestätigen',
    'common.back': 'Zurück',
    'common.next': 'Weiter',
    'common.continue': 'Fortfahren',
    'common.close': 'Schließen',
    'common.search': 'Suchen',
    'common.filter': 'Filtern',
    
    // Time & Dates
    'time.now': 'jetzt',
    'time.minutes_ago': 'vor {{count}} Minuten',
    'time.hours_ago': 'vor {{count}} Stunden',
    'time.days_ago': 'vor {{count}} Tagen',
    'time.yesterday': 'gestern',
    'time.today': 'heute',
    'time.tomorrow': 'morgen',
    
    // Validation
    'validation.required': 'Dieses Feld ist erforderlich',
    'validation.email_invalid': 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
    'validation.password_weak': 'Das Passwort muss mindestens 8 Zeichen lang sein',
    'validation.name_too_short': 'Der Name muss mindestens 3 Zeichen lang sein',
    'validation.budget_invalid': 'Bitte geben Sie einen gültigen Budget-Betrag ein',
    
    // Notifications
    'notification.success': 'Erfolgreich',
    'notification.error': 'Fehler',
    'notification.warning': 'Warnung',
    'notification.info': 'Information',
    'notification.workspace_created': 'Arbeitsbereich erfolgreich erstellt',
    'notification.campaign_approved': 'Kampagne genehmigt und geplant',
    'notification.budget_exceeded': 'Budget-Limit überschritten'
  },
  ja: {
    // Canvas & Workflow
    'canvas.step.discover': '発見',
    'canvas.step.plan': '計画',
    'canvas.step.draft': '下書き',
    'canvas.step.verify': '検証',
    'canvas.step.approve': '承認',
    'canvas.step.post': '投稿',
    'canvas.action.fix': '修正',
    'canvas.action.rerun': '再実行',
    'canvas.action.approve': '承認',
    'canvas.action.rollback': 'ロールバック',
    'canvas.status.running': '実行中',
    'canvas.status.completed': '完了',
    'canvas.status.failed': '失敗',
    'canvas.status.pending': '保留中',
    
    // Decision Cards
    'decision.risk.low': '低リスク',
    'decision.risk.medium': '中リスク',
    'decision.risk.high': '高リスク',
    'decision.action.approve': '承認',
    'decision.action.request_edits': '編集をリクエスト',
    'decision.action.escalate': 'エスカレーション',
    'decision.readiness_score': '準備スコア',
    'decision.estimated_cost': '推定コスト',
    'decision.policy_compliance': 'ポリシーコンプライアンス',
    'decision.citation_coverage': '引用範囲',
    'decision.expires_in': '{{hours}}時間後に期限切れ',
    'decision.expired': '期限切れ',
    
    // Auto Setup
    'onboard.welcome.title': 'SMM Architectへようこそ',
    'onboard.welcome.subtitle': '数分で最初のワークスペースを設定',
    'onboard.workspace.name_label': 'ワークスペース名',
    'onboard.workspace.name_placeholder': 'ワークスペース名を入力...',
    'onboard.workspace.channel_label': 'メインチャンネル',
    'onboard.oauth.connect_button': '{{platform}}と接続',
    'onboard.oauth.connection_success': '{{platform}}との接続に成功しました',
    'onboard.oauth.connection_failed': '{{platform}}との接続に失敗しました',
    'onboard.shadow_run.title': 'シャドウラン結果',
    'onboard.shadow_run.description': 'ワークスペースパフォーマンスのプレビュー',
    'onboard.complete.button': '設定完了',
    
    // Settings
    'settings.personas.title': 'ブランドペルソナ',
    'settings.personas.add_new': '新しいペルソナを追加',
    'settings.personas.edit': 'ペルソナを編集',
    'settings.personas.delete': 'ペルソナを削除',
    'settings.budget.weekly_cap': '週次予算上限',
    'settings.budget.hard_cap': '絶対上限',
    'settings.budget.current_usage': '現在の使用量: {{amount}}',
    'settings.policy.title': 'ポリシー設定',
    'settings.policy.compliance_required': 'コンプライアンス必須',
    'settings.emergency.pause_all': '緊急停止（全て）',
    'settings.emergency.resume_all': '全て再開',
    
    // Navigation
    'nav.dashboard': 'ダッシュボード',
    'nav.auto_setup': '自動設定',
    'nav.canvas': 'キャンバス',
    'nav.chat': 'チャット',
    'nav.calendar': 'カレンダー',
    'nav.connectors': 'コネクタ',
    'nav.settings': '設定',
    'nav.audit': '監査',
    
    // Authentication
    'auth.login.title': 'サインイン',
    'auth.login.email_label': 'メールアドレス',
    'auth.login.password_label': 'パスワード',
    'auth.login.submit_button': 'サインイン',
    'auth.login.forgot_password': 'パスワードをお忘れですか？',
    'auth.logout.button': 'サインアウト',
    'auth.permissions.insufficient': 'このリソースにアクセスする権限が不十分です',
    
    // Common UI
    'common.loading': '読み込み中...',
    'common.error': 'エラー',
    'common.retry': '再試行',
    'common.cancel': 'キャンセル',
    'common.save': '保存',
    'common.edit': '編集',
    'common.delete': '削除',
    'common.confirm': '確認',
    'common.back': '戻る',
    'common.next': '次へ',
    'common.continue': '続ける',
    'common.close': '閉じる',
    'common.search': '検索',
    'common.filter': 'フィルタ',
    
    // Time & Dates
    'time.now': '今',
    'time.minutes_ago': '{{count}}分前',
    'time.hours_ago': '{{count}}時間前',
    'time.days_ago': '{{count}}日前',
    'time.yesterday': '昨日',
    'time.today': '今日',
    'time.tomorrow': '明日',
    
    // Validation
    'validation.required': 'このフィールドは必須です',
    'validation.email_invalid': '有効なメールアドレスを入力してください',
    'validation.password_weak': 'パスワードは8文字以上で入力してください',
    'validation.name_too_short': '名前は3文字以上で入力してください',
    'validation.budget_invalid': '有効な予算金額を入力してください',
    
    // Notifications
    'notification.success': '成功',
    'notification.error': 'エラー',
    'notification.warning': '警告',
    'notification.info': '情報',
    'notification.workspace_created': 'ワークスペースが正常に作成されました',
    'notification.campaign_approved': 'キャンペーンが承認され、スケジュールされました',
    'notification.budget_exceeded': '予算上限を超過しました'
  },
  zh: {
    'canvas.step.discover': '发现',
    'canvas.step.plan': '计划',
    'canvas.step.draft': '草稿',
    'canvas.step.verify': '验证',
    'canvas.step.approve': '批准',
    'canvas.step.post': '发布',
    'canvas.action.fix': '修复',
    'canvas.action.rerun': '重新运行',
    'canvas.action.approve': '批准',
    'canvas.action.rollback': '回滚',
    'canvas.status.running': '运行中',
    'canvas.status.completed': '已完成',
    'canvas.status.failed': '失败',
    'canvas.status.pending': '待处理',
    
    // Decision Cards
    'decision.risk.low': '低风险',
    'decision.risk.medium': '中等风险',
    'decision.risk.high': '高风险',
    'decision.action.approve': '批准',
    'decision.action.request_edits': '请求编辑',
    'decision.action.escalate': '上升',
    'decision.readiness_score': '准备就绪分数',
    'decision.estimated_cost': '预估成本',
    'decision.policy_compliance': '政策合规性',
    'decision.citation_coverage': '引用覆盖率',
    'decision.expires_in': '{{hours}}小时后到期',
    'decision.expired': '已过期',
    
    // Auto Setup
    'onboard.welcome.title': '欢迎使用 SMM Architect',
    'onboard.welcome.subtitle': '在几分钟内设置您的第一个工作区',
    'onboard.workspace.name_label': '工作区名称',
    'onboard.workspace.name_placeholder': '输入工作区名称...',
    'onboard.workspace.channel_label': '主要渠道',
    'onboard.oauth.connect_button': '连接 {{platform}}',
    'onboard.oauth.connection_success': '成功连接到 {{platform}}',
    'onboard.oauth.connection_failed': '连接 {{platform}} 失败',
    'onboard.shadow_run.title': '影子运行结果',
    'onboard.shadow_run.description': '您的工作区性能预览',
    'onboard.complete.button': '完成设置',
    
    // Settings
    'settings.personas.title': '品牌角色',
    'settings.personas.add_new': '添加新角色',
    'settings.personas.edit': '编辑角色',
    'settings.personas.delete': '删除角色',
    'settings.budget.weekly_cap': '周预算上限',
    'settings.budget.hard_cap': '绝对上限',
    'settings.budget.current_usage': '当前使用量：{{amount}}',
    'settings.policy.title': '策略配置',
    'settings.policy.compliance_required': '必须合规',
    'settings.emergency.pause_all': '紧急暂停全部',
    'settings.emergency.resume_all': '恢复全部',
    
    // Navigation
    'nav.dashboard': '仪表盘',
    'nav.auto_setup': '自动设置',
    'nav.canvas': '画布',
    'nav.chat': '聊天',
    'nav.calendar': '日历',
    'nav.connectors': '连接器',
    'nav.settings': '设置',
    'nav.audit': '审计',
    
    // Authentication
    'auth.login.title': '登录',
    'auth.login.email_label': '电子邮件地址',
    'auth.login.password_label': '密码',
    'auth.login.submit_button': '登录',
    'auth.login.forgot_password': '忘记密码？',
    'auth.logout.button': '退出登录',
    'auth.permissions.insufficient': '权限不足，无法访问此资源',
    
    // Common UI
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.retry': '重试',
    'common.cancel': '取消',
    'common.save': '保存',
    'common.edit': '编辑',
    'common.delete': '删除',
    'common.confirm': '确认',
    'common.back': '返回',
    'common.next': '下一步',
    'common.continue': '继续',
    'common.close': '关闭',
    'common.search': '搜索',
    'common.filter': '筛选',
    
    // Time & Dates
    'time.now': '现在',
    'time.minutes_ago': '{{count}} 分钟前',
    'time.hours_ago': '{{count}} 小时前',
    'time.days_ago': '{{count}} 天前',
    'time.yesterday': '昨天',
    'time.today': '今天',
    'time.tomorrow': '明天',
    
    // Validation
    'validation.required': '此字段为必填项',
    'validation.email_invalid': '请输入有效的电子邮件地址',
    'validation.password_weak': '密码必须至少8个字符',
    'validation.name_too_short': '名称必须至少3个字符',
    'validation.budget_invalid': '请输入有效的预算金额',
    
    // Notifications
    'notification.success': '成功',
    'notification.error': '错误',
    'notification.warning': '警告',
    'notification.info': '信息',
    'notification.workspace_created': '工作区创建成功',
    'notification.campaign_approved': '活动已批准并已安排',
    'notification.budget_exceeded': '已超出预算限制'
  }
}

// I18n Provider
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [locale, setLocaleState] = useState<SupportedLocale>('en')
  const [isLoading, setIsLoading] = useState(false)
  
  // Get locale from URL or localStorage
  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') as SupportedLocale
    if (savedLocale && savedLocale in SUPPORTED_LOCALES) {
      setLocaleState(savedLocale)
    } else {
      // Detect browser locale
      const browserLocale = navigator.language.split('-')[0] as SupportedLocale
      if (browserLocale in SUPPORTED_LOCALES) {
        setLocaleState(browserLocale)
      }
    }
  }, [])
  
  const setLocale = async (newLocale: SupportedLocale) => {
    setIsLoading(true)
    
    try {
      // Save to localStorage
      localStorage.setItem('locale', newLocale)
      setLocaleState(newLocale)
      
      // Update HTML lang attribute
      document.documentElement.lang = newLocale
      
      // You could also update the URL if using locale-based routing
      // router.push(`/${newLocale}${router.asPath}`)
    } catch (error) {
      console.error('Failed to set locale:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const t: TranslationFunction = (key, params = {}) => {
    const translation = translations[locale][key] || translations.en[key] || key
    
    // Simple parameter substitution
    return Object.entries(params).reduce(
      (str, [param, value]) => str.replace(new RegExp(`{{${param}}}`, 'g'), String(value)),
      translation
    )
  }
  
  const value: I18nContextValue = {
    locale,
    setLocale,
    t,
    isLoading
  }
  
  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

// Translation hook
export function useTranslation(): { t: TranslationFunction; locale: string; setLocale: (locale: SupportedLocale) => void; isLoading: boolean } {
  const context = useContext(I18nContext)
  
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider')
  }
  
  return context
}

// Locale selector component
export function LocaleSelector() {
  const { locale, setLocale, isLoading } = useTranslation()
  
  return (
    <select 
      value={locale} 
      onChange={(e) => setLocale(e.target.value as SupportedLocale)}
      disabled={isLoading}
      className="p-2 border rounded"
    >
      {Object.entries(SUPPORTED_LOCALES).map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  )
}

// Utility functions for formatting
export const formatters = {
  currency: (amount: number, locale: string = 'en-US', currency: string = 'USD') => {
    const formatters: Record<string, Intl.NumberFormat> = {
      'en': new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
      'es': new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }),
      'fr': new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }),
      'de': new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }),
      'ja': new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }),
      'zh': new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' })
    }
    
    const formatter = formatters[locale] || formatters['en']
    return formatter.format(amount)
  },
  
  dateTime: (date: Date, locale: string = 'en-US') => {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  },
  
  relativeTime: (date: Date, locale: string = 'en-US') => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    
    if (diff < 60000) { // Less than 1 minute
      return rtf.format(-Math.floor(diff / 1000), 'second')
    } else if (diff < 3600000) { // Less than 1 hour
      return rtf.format(-Math.floor(diff / 60000), 'minute')
    } else if (diff < 86400000) { // Less than 1 day
      return rtf.format(-Math.floor(diff / 3600000), 'hour')
    } else {
      return rtf.format(-Math.floor(diff / 86400000), 'day')
    }
  },
  
  percentage: (value: number, locale: string = 'en-US') => {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value)
  }
}

// Type-safe translation helper for components
export function createTranslation<T extends Partial<TranslationKeys>>(translations: T) {
  return translations
}