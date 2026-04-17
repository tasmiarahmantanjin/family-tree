import Person from './Person'
import ParentChild from './ParentChild'
import User from './User'
import RefreshToken from './RefreshToken'

// Self-referential many-to-many: Person <-> Person through ParentChild
Person.belongsToMany(Person, {
  as: 'parents',
  through: ParentChild,
  foreignKey: 'childId',
  otherKey: 'parentId',
})

Person.belongsToMany(Person, {
  as: 'children',
  through: ParentChild,
  foreignKey: 'parentId',
  otherKey: 'childId',
})

ParentChild.belongsTo(Person, { as: 'parent', foreignKey: 'parentId' })
ParentChild.belongsTo(Person, { as: 'child', foreignKey: 'childId' })

User.hasMany(RefreshToken, { foreignKey: 'userId', onDelete: 'CASCADE' })
RefreshToken.belongsTo(User, { foreignKey: 'userId' })

export { Person, ParentChild, User, RefreshToken }
