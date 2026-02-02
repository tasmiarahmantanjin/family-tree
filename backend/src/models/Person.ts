import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/database'
import { PersonAttributes } from '../types'

type PersonCreationAttributes = Optional<PersonAttributes, 'id' | 'createdAt' | 'updatedAt'>

class Person extends Model<PersonAttributes, PersonCreationAttributes> implements PersonAttributes {
  declare id: number
  declare name: string
  declare dateOfBirth: Date
  declare placeOfBirth: string | null
  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  declare readonly parents?: Person[]
  declare readonly children?: Person[]
}

Person.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Name cannot be empty' },
      },
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    placeOfBirth: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'people',
    timestamps: true,
  },
)

export default Person
