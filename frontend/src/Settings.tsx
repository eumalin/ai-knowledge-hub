import { useState } from 'react';

interface SettingsProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  apiKeyError: string;
}

function Settings({ apiKey, onApiKeyChange, apiKeyError }: SettingsProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onApiKeyChange(e.target.value);
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Toggle settings"
            aria-expanded={showSettings}
          >
            <svg
              className="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
            Settings
          </h2>
        </div>
        {!showSettings && (
          <>
            {apiKey && !apiKeyError ? (
              <span className="text-sm text-green-600">✓ API key configured</span>
            ) : (
              <span className="text-sm text-yellow-600">⚠ API key not configured</span>
            )}
          </>
        )}
      </div>

      {showSettings && (
        <div className="mt-4">
          <h3 className="text-md font-medium text-gray-700 mb-2">OpenAI API Key</h3>
          <p className="text-sm text-gray-600 mb-4">
            Your API key is stored locally in your browser and sent directly to OpenAI. We never store your API key on our servers.
          </p>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder="sk-..."
              aria-label="OpenAI API Key"
              className={`w-full px-3 py-2 pr-24 border rounded-md focus:outline-none focus:ring-2 ${
                apiKeyError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-gray-800 px-3 py-1 rounded hover:bg-gray-100 transition-colors"
              aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>
          {apiKeyError && (
            <p className="text-red-600 text-sm mt-2" role="alert">
              {apiKeyError}
            </p>
          )}
          {apiKey && !apiKeyError && (
            <p className="text-green-600 text-sm mt-2">✓ Valid API key format</p>
          )}
        </div>
      )}
    </div>
  );
}

export default Settings;
