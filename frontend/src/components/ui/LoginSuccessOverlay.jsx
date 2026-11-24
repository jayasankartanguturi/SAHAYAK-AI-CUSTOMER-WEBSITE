import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useApp } from '../../context/AppContext';

/**
 * Full-screen login success overlay shown only after backend-confirmed authentication.
 * Displays an animated green circular checkmark, welcome message, and auto-fades
 * into the Sahayak AI dashboard. Respects reduced-motion accessibility preferences.
 */
export default function LoginSuccessOverlay({ visible }) {
  const prefersReducedMotion = useReducedMotion();
  const { accessibility, t } = useApp();
  const reduceMotion = Boolean(prefersReducedMotion || accessibility?.reduceMotion);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="login-success-overlay"
          role="status"
          aria-live="polite"
          aria-label="Login Successful. Welcome to Sahayak AI. Redirecting you to your dashboard."
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.28, ease: 'easeOut' }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#FAF9FF] px-6 select-none overflow-hidden"
        >
          {/* Subtle Sahayak AI ambient accent */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(118,80,232,0.07),transparent_58%)]"
          />

          <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full">
            {/* Brand lockup */}
            <motion.div
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.35, ease: 'easeOut' }}
              className="flex items-center gap-2.5 mb-8"
            >
              <img
                src="/images/sahayak-logo.png"
                alt="Sahayak AI"
                className="w-10 h-10 object-contain shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="text-left">
                <p className="text-[17px] font-bold text-[#171638] leading-tight">
                  {t('brand.name')}
                </p>
                <p className="text-[11px] font-medium text-[#6C6A84]">
                  {t('brand.subtitle')}
                </p>
              </div>
            </motion.div>

            {/* Animated green circular checkmark */}
            <div className="relative flex items-center justify-center mb-7">
              {!reduceMotion && (
                <motion.div
                  aria-hidden="true"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1.22, opacity: 1 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-emerald-500/12"
                />
              )}

              <motion.div
                initial={reduceMotion ? { scale: 1, opacity: 1 } : { scale: 0.45, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={
                  reduceMotion
                    ? { duration: 0.1 }
                    : { type: 'spring', stiffness: 260, damping: 20 }
                }
                className="relative w-22 h-22 sm:w-24 sm:h-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20"
              >
                <svg
                  viewBox="0 0 52 52"
                  className="w-11 h-11 sm:w-12 sm:h-12 text-white"
                  fill="none"
                  aria-hidden="true"
                >
                  <motion.path
                    d="M14 27.5L22.5 36L38.5 18"
                    stroke="currentColor"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={reduceMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={
                      reduceMotion
                        ? { duration: 0.1 }
                        : { duration: 0.45, delay: 0.18, ease: 'easeOut' }
                    }
                  />
                </svg>
              </motion.div>
            </div>

            {/* Heading & subtitle */}
            <motion.h1
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.35, delay: reduceMotion ? 0 : 0.2 }}
              className="text-[26px] sm:text-[32px] font-bold text-[#171638] tracking-tight"
            >
              {t('onboarding.loginSuccessHeading')}
            </motion.h1>

            <motion.p
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.35, delay: reduceMotion ? 0 : 0.3 }}
              className="mt-1.5 text-[15px] sm:text-[17px] font-medium text-[#5A5875]"
            >
              {t('onboarding.loginSuccessSub')}
            </motion.p>

            {/* Redirect message + subtle progress indicator */}
            <motion.div
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.35, delay: reduceMotion ? 0 : 0.4 }}
              className="mt-6 flex flex-col items-center w-full"
            >
              <p className="text-[12.5px] sm:text-[13px] font-medium text-[#85839A]">
                {t('onboarding.loginSuccessRedirect')}
              </p>
              <div className="mt-3 w-48 sm:w-56 h-1.5 rounded-full bg-[#ECEAF6] overflow-hidden">
                <motion.div
                  initial={{ width: reduceMotion ? '100%' : '0%' }}
                  animate={{ width: '100%' }}
                  transition={{
                    duration: reduceMotion ? 0.1 : 1.55,
                    delay: reduceMotion ? 0 : 0.15,
                    ease: 'easeInOut',
                  }}
                  className="h-full rounded-full bg-[#7650E8]"
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
