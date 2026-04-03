import AppConfig from '../config/config';

/**
 * Servicio para gestionar Challenges
 */
class ChallengeService {
  
  /**
   * Obtener la URL base del backend
   */
  getBaseUrl() {
    return `${AppConfig.BACKEND_URL}/api`;
  }

  /**
   * Crear un nuevo challenge
   */
  async createChallenge(challengeData, token) {
    try {
      console.log('🏆 ChallengeService.createChallenge:', challengeData);
      const response = await fetch(`${this.getBaseUrl()}/challenges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(challengeData)
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error response:', errorData);
        throw new Error(errorData.detail || 'Error al crear el challenge');
      }

      const result = await response.json();
      console.log('✅ Challenge created:', result);
      return result;
    } catch (error) {
      console.error('❌ Error creating challenge:', error);
      throw error;
    }
  }

  /**
   * Obtener invitaciones de challenges del usuario actual
   */
  async getMyInvitations(token) {
    try {
      const response = await fetch(`${this.getBaseUrl()}/challenges/my-invitations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener invitaciones');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching challenge invitations:', error);
      throw error;
    }
  }

  /**
   * Obtener challenges activos (en progreso)
   */
  async getActiveChallenges(token) {
    try {
      const response = await fetch(`${this.getBaseUrl()}/challenges/active`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener challenges activos');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching active challenges:', error);
      throw error;
    }
  }

  /**
   * Obtener challenges completados y publicados
   */
  async getCompletedChallenges(limit = 20, skip = 0, token = null) {
    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(
        `${this.getBaseUrl()}/challenges/completed?limit=${limit}&skip=${skip}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error('Error al obtener challenges completados');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching completed challenges:', error);
      throw error;
    }
  }

  /**
   * Obtener detalles de un challenge específico
   */
  async getChallengeDetails(challengeId, token = null) {
    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.getBaseUrl()}/challenges/${challengeId}`, {
        headers
      });

      if (!response.ok) {
        throw new Error('Challenge no encontrado');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching challenge details:', error);
      throw error;
    }
  }

  /**
   * Aceptar un challenge
   */
  async acceptChallenge(challengeId, token) {
    try {
      const response = await fetch(`${this.getBaseUrl()}/challenges/${challengeId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al aceptar el challenge');
      }

      return await response.json();
    } catch (error) {
      console.error('Error accepting challenge:', error);
      throw error;
    }
  }

  /**
   * Rechazar un challenge
   */
  async rejectChallenge(challengeId, token) {
    try {
      const response = await fetch(`${this.getBaseUrl()}/challenges/${challengeId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al rechazar el challenge');
      }

      return await response.json();
    } catch (error) {
      console.error('Error rejecting challenge:', error);
      throw error;
    }
  }

  /**
   * Enviar contenido (poll) para un challenge
   */
  async submitContent(challengeId, pollId, token) {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/challenges/${challengeId}/submit-content?poll_id=${pollId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al enviar contenido');
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting challenge content:', error);
      throw error;
    }
  }

  /**
   * Votar por un participante en un challenge
   */
  async voteChallenge(challengeId, participantId, token) {
    try {
      const response = await fetch(`${this.getBaseUrl()}/challenges/${challengeId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ participant_id: participantId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al votar');
      }

      return await response.json();
    } catch (error) {
      console.error('Error voting in challenge:', error);
      throw error;
    }
  }

  /**
   * Obtener el voto del usuario actual en un challenge
   */
  async getMyVote(challengeId, token) {
    try {
      const response = await fetch(`${this.getBaseUrl()}/challenges/${challengeId}/my-vote`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener voto');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching my vote:', error);
      throw error;
    }
  }
}

export default new ChallengeService();
