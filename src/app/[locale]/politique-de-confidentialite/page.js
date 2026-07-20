import { createLegalPage } from '@/lib/legal-page';

export const revalidate = 60;

const { generateMetadata, LegalPage } = createLegalPage('politique-de-confidentialite');
export { generateMetadata };
export default LegalPage;
