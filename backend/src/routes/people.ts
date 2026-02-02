import { Router } from 'express'
import people from '../controllers/people'

const router = Router()

router.get('/', people.getAll)
router.post('/', people.create)
router.put('/:id', people.update)
router.delete('/:id', people.delete)

export default router
