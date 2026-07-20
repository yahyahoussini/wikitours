import { createLegalPage } from '@/lib/legal-page';

export const revalidate = 60;

const { generateMetadata, LegalPage } = createLegalPage('cgv');
export { generateMetadata };
export default LegalPage;
