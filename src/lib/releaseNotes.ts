export interface ReleaseNote {
  version: string;
  date: string;
  title: string;
  items: string[];
}

// IMPORTANT: bump APP_VERSION and prepend a new RELEASE_NOTES entry on every shipped change.
export const APP_VERSION = '2026.04.18.1';

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '2026.04.18.1',
    date: '2026-04-18',
    title: 'Files, Subtask Deadlines & PWA Controls',
    items: [
      'Upload files to tasks and subtasks (drag-and-drop supported)',
      'Subtasks now support due dates with overdue indicators',
      'Manage app updates and clear cache from Profile Settings',
      'Automatic "What\'s New" popup whenever the app is updated',
    ],
  },
];
