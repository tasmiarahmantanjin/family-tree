import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/database'
import { AuthProvider, UserAttributes } from '../types/auth'

type UserCreationAttributes = Optional<
  UserAttributes,
  'id' | 'avatarUrl' | 'isActive' | 'lastLoginAt' | 'createdAt' | 'updatedAt'
>

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string
  declare email: string
  declare name: string
  declare avatarUrl: string | null
  declare provider: UserAttributes['provider']
  declare providerId: string
  declare isActive: boolean
  declare lastLoginAt: Date | null
  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // Email is not globally unique: identity is (provider, providerId).
    // A rare email collision across providers should not block login.
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: { msg: 'Must be a valid email address' },
      },
      set(value: string) {
        this.setDataValue('email', value.trim().toLowerCase())
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    avatarUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    provider: {
      type: DataTypes.ENUM(...Object.values(AuthProvider)),
      allowNull: false,
    },
    providerId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['provider', 'providerId'],
      },
    ],
  },
)

export default User
