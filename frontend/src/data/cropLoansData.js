export const MAJOR_CROPS = [
  { id: 'paddy', labelKey: 'cropPaddy' },
  { id: 'cotton', labelKey: 'cropCotton' },
  { id: 'maize', labelKey: 'cropMaize' },
  { id: 'soybean', labelKey: 'cropSoybean' },
  { id: 'chilli', labelKey: 'cropChilli' },
]

const allFiveCrops = MAJOR_CROPS.map(({ id }) => id)

export const cropLoansData = [
  ...MAJOR_CROPS.map(({ id }) => ({
    id: `kcc-cultivation-${id}`,
    titleKey: 'schemeCropFinanceTitle',
    descriptionKey: 'schemeCropFinanceDescription',
    kindKey: 'schemeLoanType',
    crops: [id],
    sourceLabelKey: 'schemeRbiSource',
    sourceUrl: 'https://rbi.org.in/scripts/NotificationUser.aspx?Id=13525&Mode=0',
  })),
  {
    id: 'kcc-short-term',
    titleKey: 'schemeKccTitle',
    descriptionKey: 'schemeKccDescription',
    kindKey: 'schemeLoanType',
    crops: allFiveCrops,
    sourceLabelKey: 'schemeRbiSource',
    sourceUrl: 'https://rbi.org.in/scripts/NotificationUser.aspx?Id=13525&Mode=0',
  },
  {
    id: 'interest-support',
    titleKey: 'schemeInterestTitle',
    descriptionKey: 'schemeInterestDescription',
    kindKey: 'schemeSupportType',
    crops: allFiveCrops,
    sourceLabelKey: 'schemeRbiSource',
    sourceUrl: 'https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=13270',
  },
  {
    id: 'pmfby',
    titleKey: 'schemeInsuranceTitle',
    descriptionKey: 'schemeInsuranceDescription',
    kindKey: 'schemeInsuranceType',
    crops: allFiveCrops,
    sourceLabelKey: 'schemePmfbySource',
    sourceUrl: 'https://pmfby.gov.in/',
  },
  {
    id: 'kcc-post-harvest',
    titleKey: 'schemePostHarvestTitle',
    descriptionKey: 'schemePostHarvestDescription',
    kindKey: 'schemeCreditType',
    crops: allFiveCrops,
    sourceLabelKey: 'schemeRbiSource',
    sourceUrl: 'https://rbi.org.in/scripts/NotificationUser.aspx?Id=13525&Mode=0',
  },
]
