import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Lang = 'en' | 'he'

// ─── Translations ────────────────────────────────────────────
const translations = {
  en: {
    dir: 'ltr' as const,
    lang: 'en',

    // Onboarding intro slides
    intro: {
      slides: [
        {
          emoji: '🍽',
          title: 'The place list your\nfriends actually update',
          subtitle: 'No influencers. No algorithms. Just honest picks from people whose taste you trust.',
          bg: 'from-violet-500 to-violet-700',
        },
        {
          emoji: '👥',
          title: 'Private groups,\nnot public feeds',
          subtitle: 'Create a group with your crew and share spots only with them. What happens in the group stays in the group.',
          bg: 'from-fuchsia-500 to-violet-600',
        },
        {
          emoji: '⭐',
          title: 'Real reviews from\npeople you know',
          subtitle: "Rate and review places you've actually visited. Your friends will finally know if it's worth the hype.",
          bg: 'from-amber-400 to-orange-500',
        },
        {
          emoji: '🔖',
          title: 'Plan together,\nnot alone',
          subtitle: "Save places you want to try, mark where you've been, and see who wants to go where.",
          bg: 'from-emerald-400 to-teal-600',
        },
      ],
      skip: 'Skip',
      next: 'Next',
      getStarted: 'Get started',
    },

    // Auth
    auth: {
      signIn: 'Sign in',
      signUp: 'Sign up',
      email: 'Email',
      password: 'Password',
      nickname: 'Nickname',
      createAccount: 'Create account',
      tagline: 'Recommendations from people you trust',
    },

    // Common
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      retry: 'Retry',
      loading: 'Loading…',
      noResults: 'No results',
      back: 'Back',
      search: 'Search',
      optional: 'optional',
    },

    // Groups page
    groups: {
      title: 'Your groups',
      subtitle: 'Places you actually trust',
      empty: 'No groups yet. Create one or join with an invite link.',
      failedLoad: 'Failed to load groups.',
      newGroup: 'New group',
      joinGroup: 'Join group',
      createGroup: 'Create a group',
      editGroup: 'Edit group',
      groupName: 'Group name',
      description: 'Description',
      descriptionOptional: 'Description (optional)',
      groupType: 'Group type',
      shareInvite: 'Share invite',
      linkCopied: 'Link copied!',
      deleteGroup: 'Delete this group?',
      inviteCode: 'Invite code',
      enterCode: 'Enter invite code',
      join: 'Join',
      saveChanges: 'Save changes',
      mixed: 'Mixed',
    },

    // Group feed page
    feed: {
      places: 'Places',
      activity: 'Activity',
      searchPlaces: 'Search places…',
      noPlaces: 'No places yet. Be the first to add one!',
      noActivity: 'No activity yet.',
      failedLoad: 'Failed to load places.',
      pickedTitle: "Tonight's pick 🎲",
      viewPlace: 'View place',
    },

    // Place detail
    place: {
      noReviews: 'No reviews',
      reviews: 'reviews',
      review: 'review',
      writeReview: 'Write a review',
      editReview: 'Edit your review',
      addThoughts: 'Add your thoughts… (optional)',
      addPhotos: 'Add photos',
      gallery: 'Gallery',
      camera: 'Camera',
      wantToGo: 'Want to go',
      beenThere: 'Been there',
      maps: 'Maps',
      website: 'Website',
      instagram: 'Instagram',
      phone: 'Phone',
      wolt: 'Wolt',
      tabit: 'Tabit',
      editPlace: 'Edit place',
      placeName: 'Place name',
      cuisineStyle: 'Cuisine / style (optional)',
      searchOnMaps: 'Search on Google Maps',
      coverPhoto: 'Cover photo',
      uploadCover: 'Upload cover photo',
      submitReview: 'Submit review',
    },

    // Profile
    profile: {
      places: 'Places',
      reviews: 'Reviews',
      wishlist: 'Wishlist',
      placesAdded: 'Places you added',
      yourReviews: 'Your reviews',
      wishlistTitle: '🔖 Wishlist',
      nothingHere: 'Nothing here yet.',
      yourGroups: 'Your groups',
      notifications: 'Turn on notifications',
      notificationsOff: 'Turn off notifications',
      notificationsBlocked: 'Notifications blocked (change in browser settings)',
      shareApp: 'Share app with friends',
      signOut: 'Sign out',
      changePhoto: 'Change profile photo',
      language: 'Language',
    },

    // Activity
    activity: {
      addedPlace: '📍 Added a new place',
      beenThere: '✅ Been there',
      reply: 'Reply',
      replies: 'replies',
    },

    // Comments
    comments: {
      noReplies: 'No replies yet. Be the first!',
      writeReply: 'Write a reply…',
      repliesTitle: 'Replies',
    },

    // Categories
    categories: {
      all: '✨ All',
      restaurant: '🍽 Restaurant',
      bar: '🍸 Bar',
      coffee: '☕ Coffee',
      bakery: '🥐 Bakery',
      dessert: '🍦 Dessert',
      nightclub: '🎉 Nightclub',
      other: '📍 Other',
    },

    // Search
    search: {
      placeholder: 'Search all your places…',
      empty: 'Type to search across all your groups',
      noResults: (q: string) => `No places found for "${q}"`,
    },

    // PWA
    pwa: {
      title: 'Add to Home Screen',
      subtitle: 'Get the app for the best experience',
      install: 'Install',
    },

    // Add place page
    addPlace: {
      title: 'Add a place',
      searchPlaceholder: 'Search for a restaurant, bar, café…',
      category: 'Category',
      coverPhoto: 'Cover photo (optional)',
      addingPlace: 'Adding…',
      addPlace: 'Add place',
    },
  },

  he: {
    dir: 'rtl' as const,
    lang: 'he',

    intro: {
      slides: [
        {
          emoji: '🍽',
          title: 'רשימת המקומות\nשהחברים שלך מעדכנים',
          subtitle: 'בלי אינפלואנסרים. בלי אלגוריתמים. רק המלצות מאנשים שאתה סומך על הטעם שלהם.',
          bg: 'from-violet-500 to-violet-700',
        },
        {
          emoji: '👥',
          title: 'קבוצות פרטיות,\nלא פידים ציבוריים',
          subtitle: 'צור קבוצה עם החברים שלך ושתף מקומות רק איתם. מה שקורה בקבוצה נשאר בקבוצה.',
          bg: 'from-fuchsia-500 to-violet-600',
        },
        {
          emoji: '⭐',
          title: 'ביקורות אמיתיות\nמאנשים שאתה מכיר',
          subtitle: 'דרג וכתוב ביקורות על מקומות שביקרת בהם. החברים שלך סוף סוף ידעו אם זה שווה.',
          bg: 'from-amber-400 to-orange-500',
        },
        {
          emoji: '🔖',
          title: 'תכנן ביחד,\nלא לבד',
          subtitle: 'שמור מקומות שרוצה לנסות, סמן איפה היית, ותראה מי רוצה ללכת לאן.',
          bg: 'from-emerald-400 to-teal-600',
        },
      ],
      skip: 'דלג',
      next: 'הבא',
      getStarted: 'בואו נתחיל',
    },

    auth: {
      signIn: 'כניסה',
      signUp: 'הרשמה',
      email: 'אימייל',
      password: 'סיסמה',
      nickname: 'כינוי',
      createAccount: 'יצירת חשבון',
      tagline: 'המלצות מאנשים שאתה סומך עליהם',
    },

    common: {
      save: 'שמור',
      cancel: 'ביטול',
      delete: 'מחק',
      edit: 'ערוך',
      retry: 'נסה שוב',
      loading: 'טוען…',
      noResults: 'אין תוצאות',
      back: 'חזרה',
      search: 'חיפוש',
      optional: 'אופציונלי',
    },

    groups: {
      title: 'הקבוצות שלך',
      subtitle: 'מקומות שאתה באמת סומך עליהם',
      empty: 'עדיין אין קבוצות. צור אחת או הצטרף עם לינק הזמנה.',
      failedLoad: 'טעינת הקבוצות נכשלה.',
      newGroup: 'קבוצה חדשה',
      joinGroup: 'הצטרף לקבוצה',
      createGroup: 'יצירת קבוצה',
      editGroup: 'עריכת קבוצה',
      groupName: 'שם הקבוצה',
      description: 'תיאור',
      descriptionOptional: 'תיאור (אופציונלי)',
      groupType: 'סוג קבוצה',
      shareInvite: 'שתף הזמנה',
      linkCopied: 'הלינק הועתק!',
      deleteGroup: 'למחוק את הקבוצה?',
      inviteCode: 'קוד הזמנה',
      enterCode: 'הכנס קוד הזמנה',
      join: 'הצטרף',
      saveChanges: 'שמור שינויים',
      mixed: 'מעורב',
    },

    feed: {
      places: 'מקומות',
      activity: 'פעילות',
      searchPlaces: 'חפש מקומות…',
      noPlaces: 'עדיין אין מקומות. היה הראשון להוסיף!',
      noActivity: 'עדיין אין פעילות.',
      failedLoad: 'טעינת המקומות נכשלה.',
      pickedTitle: 'הבחירה של הלילה 🎲',
      viewPlace: 'צפה במקום',
    },

    place: {
      noReviews: 'אין ביקורות',
      reviews: 'ביקורות',
      review: 'ביקורת',
      writeReview: 'כתוב ביקורת',
      editReview: 'ערוך את הביקורת שלך',
      addThoughts: 'הוסף מחשבות… (אופציונלי)',
      addPhotos: 'הוסף תמונות',
      gallery: 'גלריה',
      camera: 'מצלמה',
      wantToGo: 'רוצה ללכת',
      beenThere: 'הייתי שם',
      maps: 'מפות',
      website: 'אתר',
      instagram: 'אינסטגרם',
      phone: 'טלפון',
      wolt: 'וולט',
      tabit: 'טביט',
      editPlace: 'ערוך מקום',
      placeName: 'שם המקום',
      cuisineStyle: 'סגנון / מטבח (אופציונלי)',
      searchOnMaps: 'חפש בגוגל מפות',
      coverPhoto: 'תמונת כריכה',
      uploadCover: 'העלה תמונת כריכה',
      submitReview: 'שלח ביקורת',
    },

    profile: {
      places: 'מקומות',
      reviews: 'ביקורות',
      wishlist: 'רשימת משאלות',
      placesAdded: 'מקומות שהוספת',
      yourReviews: 'הביקורות שלך',
      wishlistTitle: '🔖 רשימת משאלות',
      nothingHere: 'עדיין אין כלום.',
      yourGroups: 'הקבוצות שלך',
      notifications: 'הפעל התראות',
      notificationsOff: 'כבה התראות',
      notificationsBlocked: 'התראות חסומות (שנה בהגדרות הדפדפן)',
      shareApp: 'שתף את האפליקציה עם חברים',
      signOut: 'התנתק',
      changePhoto: 'שנה תמונת פרופיל',
      language: 'שפה',
    },

    activity: {
      addedPlace: '📍 הוסיף מקום חדש',
      beenThere: '✅ היה שם',
      reply: 'הגב',
      replies: 'תגובות',
    },

    comments: {
      noReplies: 'עדיין אין תגובות. היה הראשון!',
      writeReply: 'כתוב תגובה…',
      repliesTitle: 'תגובות',
    },

    categories: {
      all: '✨ הכל',
      restaurant: '🍽 מסעדה',
      bar: '🍸 בר',
      coffee: '☕ קפה',
      bakery: '🥐 מאפייה',
      dessert: '🍦 קינוחים',
      nightclub: '🎉 מועדון',
      other: '📍 אחר',
    },

    search: {
      placeholder: 'חפש בכל המקומות שלך…',
      empty: 'הקלד כדי לחפש בכל הקבוצות שלך',
      noResults: (q: string) => `לא נמצאו מקומות עבור "${q}"`,
    },

    pwa: {
      title: 'הוסף למסך הבית',
      subtitle: 'קבל את האפליקציה לחוויה הטובה ביותר',
      install: 'התקן',
    },

    addPlace: {
      title: 'הוסף מקום',
      searchPlaceholder: 'חפש מסעדה, בר, קפה…',
      category: 'קטגוריה',
      coverPhoto: 'תמונת כריכה (אופציונלי)',
      addingPlace: 'מוסיף…',
      addPlace: 'הוסף מקום',
    },
  },
}

export type T = typeof translations['en']

// ─── Store ───────────────────────────────────────────────────
interface LangStore {
  lang: Lang
  setLang: (l: Lang) => void
}

export const useLangStore = create<LangStore>()(
  persist(
    (set) => ({ lang: 'en', setLang: (lang) => set({ lang }) }),
    { name: 'friendspots-lang' }
  )
)

export function useT(): T {
  const { lang } = useLangStore()
  return translations[lang] as T
}

export function applyDir(lang: Lang) {
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'
  document.documentElement.lang = lang
}
