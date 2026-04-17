import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/database'
import { RefreshTokenAttributes } from '../types/auth'

type RefreshTokenCreationAttributes = Optional<
  RefreshTokenAttributes,
  'id' | 'revokedAt' | 'replacedByTokenId' | 'userAgent' | 'ip' | 'createdAt'
>

class RefreshToken
  extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes>
  implements RefreshTokenAttributes
{
  declare id: string
  declare userId: string
  declare tokenHash: string
  declare expiresAt: Date
  declare revokedAt: Date | null
  declare replacedByTokenId: string | null
  declare userAgent: string | null
  declare ip: string | null
  declare readonly createdAt: Date
}

RefreshToken.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    tokenHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    replacedByTokenId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ip: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'refresh_tokens',
    timestamps: true,
    updatedAt: false,
    indexes: [{ fields: ['userId'] }, { fields: ['expiresAt'] }],
  },
)

export default RefreshToken
