// Central updates feed for SAS.
// To publish a new update: add a new entry at the TOP with a fresh `id`
// (use the publish date, e.g. "2026-09-12"). The popup compares the stored
// "last read" id against UPDATES[0].id, so a new id = popup shows again.
//
// Storage key lives here so the page and the popup always agree.

export interface UpdateEntry {
  id: string; // unique, date-based works great: "YYYY-MM-DD" (add -2 if two in a day)
  date: string; // human-readable date shown on cards
  tag: string; // small category chip
  title: string;
  summary: string; // shown on the card + in the popup
  body: string[]; // full paragraphs, revealed with "Read more"
}

export const UPDATE_STORAGE_KEY = "sas_last_read_update";

export const UPDATES: UpdateEntry[] = [
  {
    id: "2026-09-05",
    date: "September 5, 2026",
    tag: "Mobile + Sharing",
    title: "Mobile overhaul & QR code sharing",
    summary:
      "SAS is now fully mobile-friendly — a scrollable attendee table, compact controls — and sharing a session takes one tap with a built-in QR code.",
    body: [
      "SAS was built desktop-first, and it showed. On phones, the attendee table squeezed its columns into each other, buttons overlapped the class key, and the whole dashboard felt cramped.",
      "This update reworks the entire mobile experience. The attendees table now scrolls sideways instead of squashing, every button and card is more compact, and page margins shrink so far more fits on a small screen. Nothing changed on desktop.",
      "Sharing a session is now one tap too: a new Share Check-in card on the dashboard shows a QR code for the session link, with a Copy Link button and a downloadable QR image you can drop into slides or print for the door.",
      "We also removed the JSON export to keep the dashboard focused — the PDF report remains the single, clean way to export attendance.",
    ],
  },
  {
    id: "2026-08-20",
    date: "August 20, 2026",
    tag: "Customization",
    title: "Choose the details you want to collect",
    summary:
      "When creating a session you now decide exactly which fields attendees fill in — name, registration number, email, phone, or your own custom fields.",
    body: [
      "Every session is different. A lecture needs a name and registration number; a workshop might need an email for follow-up materials. Previously every check-in form asked the same thing.",
      "Now, when creating a session, you choose which fields attendees fill in — Full Name, Registration Number, Email, Phone, or any custom fields you define.",
      "Duplicate protection got smarter as well. SAS automatically picks the most unique field available (registration number first, then email, then phone, then name) to block double check-ins and to merge attendance accurately across devices.",
    ],
  },
  {
    id: "2026-08-01",
    date: "August 1, 2026",
    tag: "Launch",
    title: "Why we built SAS",
    summary:
      "SAS (Student Attendance System) exists because the old way of taking attendance wastes class time, loses records, and delays reports.",
    body: [
      "SAS started with a simple frustration: taking attendance the old way eats class time. Calling names from a register takes five to ten minutes of every lecture, paper lists get lost, spellings get mangled, and by the time a register reaches an administrator's desk the data is already stale.",
      "We built SAS so attendance takes seconds, not minutes. The lecturer starts a session and gets a unique class key; students check in from any device; and the dashboard fills up in real time.",
      "Every session tracks expected versus attended numbers, the attendance rate, and exact check-in times — and exports a clean PDF report you can hand in. No paper, no lost registers, no guesswork.",
      "This page is where we'll announce every improvement as SAS grows. Check back whenever the update popup appears.",
    ],
  },
];