/**
 * Mock Data
 *
 * Previously contained simulated data for development.
 * Now empty — all data is fetched from Firebase Firestore.
 * These exports are kept for backward compatibility with helper functions.
 */

export const MOCK_PROJECTS = [];

export const MOCK_ALERTS = [];

/**
 * Helper function to get alerts for a specific project
 */
export const getAlertsByProject = (projectId) => {
  return MOCK_ALERTS.filter(alert => alert.projectId === projectId);
};

/**
 * Helper function to get project by ID
 */
export const getProjectById = (projectId) => {
  return MOCK_PROJECTS.find(project => project.id === projectId);
};

/**
 * Helper function to get projects by category
 */
export const getProjectsByCategory = (category) => {
  if (category === 'All') {
    return MOCK_PROJECTS;
  }
  return MOCK_PROJECTS.filter(project => project.category === category);
};

/**
 * Helper function to search projects
 */
export const searchProjects = (query) => {
  const lowerQuery = query.toLowerCase();
  return MOCK_PROJECTS.filter(project =>
    project.name.toLowerCase().includes(lowerQuery) ||
    project.description.toLowerCase().includes(lowerQuery) ||
    project.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};

/**
 * Helper function to get unread alert count
 */
export const getUnreadAlertCount = () => {
  return MOCK_ALERTS.filter(alert => !alert.read).length;
};
