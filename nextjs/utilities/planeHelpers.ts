import planesData from "@/data/planes.json";

/**
 * Get plane display name with nickname if available
 * @param registration - Plane registration (e.g., "OH-386")
 * @returns Display name like "OH-386 (Tuulia)" or "OH-CON" if no nickname
 */
export const getPlaneDisplayName = (registration: string): string => {
  const plane = planesData.find((p) => p.registeration === registration);

  if (!plane || !plane.nickname) {
    return registration;
  }

  return `${registration} (${plane.nickname})`;
};

/**
 * Get plane information
 */
export const getPlaneInfo = (registration: string) => {
  const plane = planesData.find((p) => p.registeration === registration);

  if (!plane) {
    return {
      registration,
      name: registration,
      nickname: null,
      displayName: registration,
    };
  }

  return {
    registration,
    name: plane.name,
    nickname: plane.nickname,
    displayName: getPlaneDisplayName(registration),
  };
};
