import { test, expect, Page } from '@playwright/test'

const selectOptionByText = async (page: Page, selectId: string, text: string) => {
  const select = page.locator(`select#${selectId}`)
  const options = await select.locator('option').all()

  for (const option of options) {
    const optionText = await option.textContent()
    if (optionText?.includes(text)) {
      const value = await option.getAttribute('value')
      if (value) {
        await select.selectOption(value)
        return
      }
    }
  }
}

const createPerson = async (page: Page, name: string, dateOfBirth: string, waitTime = 3500) => {
  await page.fill('input[name="name"]', name)
  await page.fill('input[name="dateOfBirth"]', dateOfBirth)
  const submitButton = page.locator('button:has-text("Add Person")')
  await expect(submitButton).toBeEnabled({ timeout: 5000 })
  await submitButton.click()
  await expect(page.locator('text=Person added successfully')).toBeVisible()
  await page.waitForTimeout(waitTime)
}

const linkParentChild = async (page: Page, parentName: string, childName: string) => {
  await selectOptionByText(page, 'parentId', parentName)
  await page.waitForTimeout(500)
  await selectOptionByText(page, 'childId', childName)
  await page.waitForTimeout(1000)

  const linkButton = page.locator('button[type="submit"]:has-text("Link")')
  await linkButton.waitFor({ state: 'visible', timeout: 5000 })
  await expect(linkButton).toBeEnabled({ timeout: 20000 })
  await linkButton.click()
  await expect(page.locator('text=Relationship linked successfully')).toBeVisible({
    timeout: 10000,
  })
  await page.waitForTimeout(2000)
}

test.describe('Family Tree App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.describe('Form Validation', () => {
    test('should disable submit for invalid inputs', async ({ page }) => {
      await expect(page.locator('button:has-text("Add Person")')).toBeDisabled()

      await page.fill('input[name="name"]', 'Test Person')
      await expect(page.locator('button:has-text("Add Person")')).toBeDisabled()

      await page.fill('input[name="name"]', '')
      await page.fill('input[name="dateOfBirth"]', '1990-01-15')
      await expect(page.locator('button:has-text("Add Person")')).toBeDisabled()

      await page.fill('input[name="name"]', 'Future Person')
      await page.fill('input[name="dateOfBirth"]', '2030-01-01')
      await expect(page.locator('text=Date of birth cannot be in the future')).toBeVisible()
      await expect(page.locator('button:has-text("Add Person")')).toBeDisabled()
    })
  })

  test.describe('Person Management', () => {
    test('should create and update a person', async ({ page }) => {
      await page.fill('input[name="name"]', 'John Doe')
      await page.fill('input[name="dateOfBirth"]', '1960-01-15')
      await page.fill('input[name="placeOfBirth"]', 'New York')

      const submitButton = page.locator('button:has-text("Add Person")')
      await expect(submitButton).toBeEnabled({ timeout: 5000 })
      await submitButton.click()

      await expect(page.locator('text=Person added successfully')).toBeVisible()
      await expect(page.getByRole('heading', { name: 'John Doe' }).first()).toBeVisible()
      await page.waitForTimeout(1000)

      const personCard = page.locator('[data-person-id]').first()
      await personCard.hover()
      await personCard.locator('button:has-text("Edit")').click()

      const modalTitle = page.locator('#edit-person-title')
      await expect(modalTitle).toBeVisible()

      const nameInput = page.locator('input[name="name"]').last()
      await nameInput.clear()
      await nameInput.fill('John Smith')

      const saveButton = page.locator('button:has-text("Save")')
      await expect(saveButton).toBeEnabled({ timeout: 5000 })
      await saveButton.click()

      await expect(modalTitle).not.toBeVisible({ timeout: 5000 })
      await expect(page.getByRole('heading', { name: 'John Smith' }).first()).toBeVisible()
    })
  })

  test.describe('Relationship Management', () => {
    test('should link, validate age, and unlink relationships', async ({ page }) => {
      await createPerson(page, 'David Brown', '1950-01-01')
      await createPerson(page, 'Emily Brown', '1980-01-01')
      await createPerson(page, 'Young Sam', '1995-01-01')

      await selectOptionByText(page, 'parentId', 'Young Sam')
      await selectOptionByText(page, 'childId', 'Emily Brown')
      await expect(page.locator('text=/Age difference.*years older/')).toBeVisible()

      await selectOptionByText(page, 'parentId', 'David Brown')
      await selectOptionByText(page, 'childId', 'Emily Brown')

      const linkButton = page.locator('button[type="submit"]:has-text("Link")')
      await expect(linkButton).toBeEnabled({ timeout: 5000 })
      await linkButton.click()
      await expect(page.locator('text=Relationship linked successfully')).toBeVisible()

      const unlinkTab = page.getByRole('tab', { name: 'Unlink', exact: true })
      await expect(unlinkTab).toBeEnabled()
      await unlinkTab.click()

      await selectOptionByText(page, 'parentId', 'David Brown')
      await selectOptionByText(page, 'childId', 'Emily Brown')

      const unlinkButton = page.locator('button[type="submit"]:has-text("Unlink")')
      await expect(unlinkButton).toBeEnabled({ timeout: 5000 })
      await unlinkButton.click()

      await expect(page.locator('text=Relationship unlinked successfully')).toBeVisible()
    })
  })

  test.describe('Family Tree Display', () => {
    test('should show family tree section', async ({ page }) => {
      const familyTreeHeading = page.getByRole('heading', { name: 'Family Tree' })
      await expect(familyTreeHeading.first()).toBeVisible()
    })

    test('should display multi-generation family with SVG lines and hover highlighting', async ({
      page,
    }) => {
      test.setTimeout(90000)

      await createPerson(page, 'Albert Smith', '1940-01-01', 1500)
      await createPerson(page, 'Mary Smith', '1942-01-01', 1500)
      await createPerson(page, 'James Smith', '1965-01-01', 1500)
      await createPerson(page, 'Anna Smith', '1968-01-01', 1500)
      await createPerson(page, 'Robert Smith', '1990-01-01', 1500)
      await createPerson(page, 'Sophie Smith', '1992-01-01', 1500)

      await linkParentChild(page, 'Albert Smith', 'James Smith')
      await linkParentChild(page, 'Mary Smith', 'James Smith')
      await linkParentChild(page, 'Albert Smith', 'Anna Smith')
      await linkParentChild(page, 'Mary Smith', 'Anna Smith')
      await linkParentChild(page, 'James Smith', 'Robert Smith')
      await linkParentChild(page, 'Anna Smith', 'Sophie Smith')

      const personCards = page.locator('[data-person-id]')
      const cardCount = await personCards.count()
      expect(cardCount).toBeGreaterThanOrEqual(6)

      const svg = page.locator('.card svg')
      await expect(svg).toBeVisible()

      const paths = svg.locator('path')
      const pathCount = await paths.count()
      expect(pathCount).toBeGreaterThanOrEqual(6)

      const personCard = page.locator('[data-person-id]').first()
      await personCard.hover()
      await page.waitForTimeout(500)
      await expect(personCard).toHaveClass(/scale-105/)

      await expect(page.getByRole('heading', { name: 'Albert Smith' }).first()).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Sophie Smith' }).first()).toBeVisible()
    })
  })
})
