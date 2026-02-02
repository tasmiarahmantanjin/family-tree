import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/database'
import { ParentChildAttributes } from '../types'
import Person from './Person'

type ParentChildCreationAttributes = Optional<ParentChildAttributes, 'id' | 'createdAt'>

class ParentChild
  extends Model<ParentChildAttributes, ParentChildCreationAttributes>
  implements ParentChildAttributes
{
  declare id: number
  declare parentId: number
  declare childId: number
  declare readonly createdAt: Date

  declare readonly parent?: Person
  declare readonly child?: Person
}

ParentChild.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'people',
        key: 'id',
      },
    },
    childId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'people',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    tableName: 'parent_child',
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['parentId', 'childId'],
      },
    ],
    validate: {
      notSelfParent() {
        if (this.parentId === this.childId) {
          throw new Error('A person cannot be their own parent')
        }
      },
    },
  },
)

export default ParentChild
