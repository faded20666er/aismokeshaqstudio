class CreditsManager {
  constructor(kv) {
    this.kv = kv; // Redis, Upstash, Vercel KV, etc.
  }

  async getCredits(userId) {
    const credits = await this.kv.get(`credits:${userId}`);
    return credits ? parseInt(credits) : 0;
  }

  async setCredits(userId, amount) {
    await this.kv.set(`credits:${userId}`, amount);
    return amount;
  }

  async addCredits(userId, amount) {
    const current = await this.getCredits(userId);
    const updated = current + amount;
    await this.setCredits(userId, updated);
    return updated;
  }

  async deductCredits(userId, amount) {
    const current = await this.getCredits(userId);

    if (current < amount) {
      return { success: false, remaining: current };
    }

    const updated = current - amount;
    await this.setCredits(userId, updated);

    return { success: true, remaining: updated };
  }

  async hasEnough(userId, cost) {
    const current = await this.getCredits(userId);
    return current >= cost;
  }
}

module.exports = CreditsManager;
