/**
 * @file flagRegistry.js
 * @description Pre-imported flag components for Cricket Manager nationalities
 * Only imports the 19 flags we actually use (West Indies is custom)
 * This reduces bundle size by ~900KB compared to importing all 249 country flags
 */

// Import only the 19 flags needed (alphabetically by country name)
import AF from 'country-flag-icons/react/3x2/AF'; // Afghanistan
import AU from 'country-flag-icons/react/3x2/AU'; // Australia
import BD from 'country-flag-icons/react/3x2/BD'; // Bangladesh
import CA from 'country-flag-icons/react/3x2/CA'; // Canada
import GB from 'country-flag-icons/react/3x2/GB'; // England/Scotland (both use Great Britain flag)
import IN from 'country-flag-icons/react/3x2/IN'; // India
import IE from 'country-flag-icons/react/3x2/IE'; // Ireland
import NA from 'country-flag-icons/react/3x2/NA'; // Namibia
import NP from 'country-flag-icons/react/3x2/NP'; // Nepal
import NL from 'country-flag-icons/react/3x2/NL'; // Netherlands
import NZ from 'country-flag-icons/react/3x2/NZ'; // New Zealand
import OM from 'country-flag-icons/react/3x2/OM'; // Oman
import PK from 'country-flag-icons/react/3x2/PK'; // Pakistan
import ZA from 'country-flag-icons/react/3x2/ZA'; // South Africa
import LK from 'country-flag-icons/react/3x2/LK'; // Sri Lanka
import AE from 'country-flag-icons/react/3x2/AE'; // United Arab Emirates
import US from 'country-flag-icons/react/3x2/US'; // United States of America
import ZW from 'country-flag-icons/react/3x2/ZW'; // Zimbabwe

/**
 * Registry of flag components mapped to ISO codes
 * West Indies (WI) not included - uses custom rendering in CountryFlag.jsx
 *
 * Countries included (19 total):
 * - Afghanistan, Australia, Bangladesh, Canada
 * - England (GB), India, Ireland, Namibia
 * - Nepal, Netherlands, New Zealand, Oman
 * - Pakistan, Scotland (GB), South Africa, Sri Lanka
 * - UAE, USA, Zimbabwe
 */
export const FLAG_COMPONENTS = {
  AF, AU, BD, CA, GB, IN, IE, NA, NL, NP, NZ, OM, PK, ZA, LK, AE, US, ZW
};
