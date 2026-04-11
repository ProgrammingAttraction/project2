import React from 'react';
import { FaFacebookF, FaInstagram, FaYoutube, FaCcVisa, FaCcMastercard, FaCcAmex, FaCcPaypal, FaBitcoin, FaEthereum } from 'react-icons/fa';
import { SiLitecoin } from 'react-icons/si';
import { TbBrandBinance } from 'react-icons/tb';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const casinoLinks = [
    { name: 'Live-Dealer', href: '#' },
    { name: 'Aviator', href: '#' },
    { name: 'Welcome bonus', href: '#' },
    { name: 'Tournaments', href: '#' },
  ];

  const infoLinks = [
    { name: 'Company', href: '#' },
    { name: 'T&C', href: '#' },
    { name: 'KYC & AML Policy', href: '#' },
    { name: 'Privacy & Security', href: '#' },
    { name: 'Responsible Gambling', href: '#' },
    { name: 'Cookie policy', href: '#' },
  ];

  const socialLinks = [
    { name: 'Facebook', icon: FaFacebookF, href: '#', color: 'hover:bg-[#1877f2]' },
    { name: 'Instagram', icon: FaInstagram, href: '#', color: 'hover:bg-[#e4405f]' },
    { name: 'YouTube', icon: FaYoutube, href: '#', color: 'hover:bg-[#cd201f]' },
  ];

  const paymentIcons = [
    { icon: FaCcVisa, name: 'Visa' },
    { icon: FaCcMastercard, name: 'Mastercard' },
    { icon: FaCcAmex, name: 'American Express' },
    { icon: FaCcPaypal, name: 'PayPal' },
    { icon: FaBitcoin, name: 'Bitcoin' },
    { icon: FaEthereum, name: 'Ethereum' },
    { icon: TbBrandBinance, name: 'Binance' },
    { icon: SiLitecoin, name: 'Litecoin' },
  ];

  return (
    <footer className="bg-gray-200 text-gray-700 mt-auto">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Brand Section */}
          <div className="text-center sm:text-left">
            <div className="flex flex-col items-center sm:items-start">
              <div className="flex items-center gap-1 mb-2">
                <span className="text-2xl">👑</span>
                <span className="font-barlow text-2xl md:text-3xl font-black text-gray-900 tracking-wide">
                  GLORY
                </span>
              </div>
              <span className="font-barlow text-xs font-bold text-red-600 tracking-[3px] uppercase">
                Casino
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-4 leading-relaxed">
              Experience the thrill of premium online gaming with GLORY Casino. 
              Safe, secure, and endlessly entertaining.
            </p>
          </div>

          {/* Casino Links */}
          <div>
            <h3 className="font-barlow text-lg font-bold text-gray-900 mb-4 tracking-wide">
              Casino
            </h3>
            <ul className="space-y-2">
              {casinoLinks.map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Information Links */}
          <div>
            <h3 className="font-barlow text-lg font-bold text-gray-900 mb-4 tracking-wide">
              Information
            </h3>
            <ul className="space-y-2">
              {infoLinks.map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Networks */}
          <div>
            <h3 className="font-barlow text-lg font-bold text-gray-900 mb-4 tracking-wide">
              Social networks
            </h3>
            <div className="flex gap-3 justify-center sm:justify-start">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className={`w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 transition-all duration-200 ${social.color} hover:text-white hover:scale-110`}
                  aria-label={social.name}
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
            
            {/* Payment Methods */}
            <div className="mt-6">
              <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                Accepted Payments
              </h4>
              <div className="flex flex-wrap gap-3">
                {paymentIcons.map((payment) => (
                  <div
                    key={payment.name}
                    className="w-10 h-7 bg-gray-300 rounded-md flex items-center justify-center text-gray-600"
                    title={payment.name}
                  >
                    <payment.icon size={20} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Visa Line (standalone visa icon as shown in image) */}
        <div className="flex justify-center my-8">
          <div className="w-16 h-10 bg-gray-300 rounded-lg flex items-center justify-center">
            <FaCcVisa size={32} className="text-[#1a1f71]" />
          </div>
        </div>

        {/* Company Info & Legal Text */}
        <div className="border-t border-gray-300 pt-8 mt-4">
          <div className="text-xs text-gray-600 leading-relaxed space-y-3">
            <p>
              The website is operated by Bettor IO N.V., with registered address at Schottegatweg Oost 10, 
              Unit 1 - 9 Bon Bini Business Center, Willemstad, Curacao, the company incorporated under the 
              laws of Curacao with Company Number 157065 holds a valid Certificate of Operation. 
              Bettor IO N.V. has an application (OGL/2024/1699/1163) for a gaming license in progress with 
              the Curacao Gaming. Bettor IO N.V. is managed by Kurason Trust Curacao N.V., with registered 
              address at Schottegatweg Oost 10, Unit 1 - 9 Bon Bini Business Center, Willemstad, Curacao, 
              registration no 127003.
            </p>
          </div>
          
          {/* Copyright and Version */}
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 text-xs text-gray-500">
            <span>© {currentYear} GLORY Casino. All rights reserved.</span>
            <span className="mt-2 sm:mt-0">Version v2.1.14</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;