import React from 'react';
import './AvatarPicker.css';

const DEFAULT_AVATARS = [
  '/1.jpeg',
  '/2.jpeg',
  '/3.jpeg',
  '/4.jpeg',
  '/5.jpeg',
  '/6.jpeg',
  '/7.jpeg',
  '/8.jpeg',
  '/9.jpeg',
  '/10.jpeg',
  '/11.png',
  '/12.jpeg',
  '/13.jpeg',
  '/14.jpeg',
  '/15.jpeg',
  '/16.jpeg',
  '/17.jpeg',
  '/18.jpeg',
  '/19.jpeg',
  '/20.jpeg',
  '/21.jpeg',
  '/22.jpeg',
  '/23.jpeg',
  '/24.jpeg',
  '/25.jpeg',
  '/26.jpeg',
  '/27.jpeg',
  '/28.jpeg',
  '/29.jpeg',
  '/30.jpeg'
];

export default function AvatarPicker({ open, onClose, onSelect, selectedAvatar }) {
  if (!open) return null;

  return (
    <div className="avatar-picker-backdrop" onClick={onClose}>
      <div className="avatar-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="avatar-picker-header">
          <h3>Choose Your Avatar</h3>
          <button type="button" className="avatar-picker-close" onClick={onClose} aria-label="Close avatar picker">
            x
          </button>
        </div>

        <div className="avatar-picker-grid">
          {DEFAULT_AVATARS.map((avatarPath) => {
            const isSelected = selectedAvatar === avatarPath;

            return (
              <button
                type="button"
                key={avatarPath}
                className={`avatar-picker-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelect(avatarPath)}
                title="Select avatar"
              >
                <img src={avatarPath} alt="Avatar option" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
