import { toast } from "react-hot-toast";

/**
 * Belirli bir planın detaylarını getirir
 */
export const getPlan = async (id: string) => {
  try {
    const response = await fetch(`/api/plans/${id}`);
    
    if (!response.ok) {
      throw new Error('Plan detayları getirilemedi');
    }
    
    return await response.json();
  } catch (error) {
    console.error("Plan getirme hatası:", error);
    throw error;
  }
};

/**
 * Plana katılma işlemini gerçekleştirir
 */
export const joinPlan = async (planId: string) => {
  try {
    const response = await fetch(`/api/plans/${planId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Plana katılırken bir hata oluştu');
    }
    
    return await response.json();
  } catch (error) {
    console.error("Plana katılma hatası:", error);
    throw error;
  }
};

/**
 * Plandan ayrılma işlemini gerçekleştirir
 */
export const leavePlan = async (planId: string) => {
  try {
    const response = await fetch(`/api/plans/${planId}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Plandan ayrılırken bir hata oluştu');
    }
    
    return await response.json();
  } catch (error) {
    console.error("Plandan ayrılma hatası:", error);
    throw error;
  }
};

/**
 * Planı beğenme işlemini gerçekleştirir
 */
export const likePlan = async (planId: string) => {
  try {
    const response = await fetch(`/api/plans/${planId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Plan beğenilirken bir hata oluştu');
    }
    
    return await response.json();
  } catch (error) {
    console.error("Plan beğenme hatası:", error);
    throw error;
  }
};

/**
 * Planı kaydetme işlemini gerçekleştirir
 */
export const savePlan = async (planId: string) => {
  try {
    const response = await fetch(`/api/plans/${planId}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Plan kaydedilirken bir hata oluştu');
    }
    
    return await response.json();
  } catch (error) {
    console.error("Plan kaydetme hatası:", error);
    throw error;
  }
}; 