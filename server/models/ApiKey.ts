import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { encrypt, decrypt } from '../utils/crypto';

class ApiKey extends Model {
  public id!: number;
  public userId!: string;
  public encryptedKey!: string;
  public encryptedSecret!: string;
  
  static async storeKeys(userId: string, key: string, secret: string) {
    return this.create({
      userId,
      encryptedKey: encrypt(key),
      encryptedSecret: encrypt(secret)
    });
  }

  static async getKeys(userId: string) {
    const record = await this.findOne({ where: { userId } });
    if (!record) return null;
    return {
      key: decrypt(record.encryptedKey),
      secret: decrypt(record.encryptedSecret)
    };
  }
}

ApiKey.init({
  userId: { type: DataTypes.STRING, allowNull: false },
  encryptedKey: { type: DataTypes.TEXT, allowNull: false },
  encryptedSecret: { type: DataTypes.TEXT, allowNull: false }
}, { sequelize });

export default ApiKey;
