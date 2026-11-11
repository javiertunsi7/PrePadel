import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ExerciseSheet, hasMedia, type ExerciseInfo } from './ExerciseSheet';

const squat: ExerciseInfo = {
  exerciseSlug: 'media-sentadilla',
  name: 'Media sentadilla',
  zone: 'KNEE',
  instructions: 'Baja como si fueras a sentarte.',
  equipment: null,
  switchSides: false,
  videoUrl: null,
};

describe('ficha de ejercicio', () => {
  it('enseña la ilustración, la explicación y la dosis de la rutina', () => {
    render(<ExerciseSheet exercise={squat} dose={{ seconds: 60, dosage: '12 repeticiones' }} onClose={() => {}} />);

    const sheet = screen.getByRole('dialog', { name: 'Media sentadilla' });
    expect(screen.getByRole('img', { name: 'Ilustración: Media sentadilla' })).toBeInTheDocument();
    expect(sheet).toHaveTextContent('Baja como si fueras a sentarte.');
    expect(sheet).toHaveTextContent('1 min');
    expect(sheet).toHaveTextContent('12 repeticiones');
    expect(sheet).not.toHaveTextContent('Necesitas');
  });

  it('cuando el ejercicio tiene vídeo, lo enseña en lugar del dibujo', () => {
    const withVideo = { ...squat, videoUrl: 'https://videos.example/media-sentadilla.mp4' };
    const { container } = render(<ExerciseSheet exercise={withVideo} onClose={() => {}} />);

    expect(container.querySelector('video')).toHaveAttribute('src', withVideo.videoUrl);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('sin vídeo ni dibujo se queda en el texto', () => {
    const plain = { ...squat, exerciseSlug: 'ejercicio-nuevo' };
    const { container } = render(<ExerciseSheet exercise={plain} onClose={() => {}} />);

    expect(hasMedia(plain)).toBe(false);
    expect(container.querySelector('svg.figure, video')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent('Baja como si fueras a sentarte.');
  });

  it('se cierra con el botón, tocando fuera o con Escape, pero no al tocar la ficha', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ExerciseSheet exercise={squat} onClose={onClose} />);

    await user.click(screen.getByRole('heading', { name: 'Media sentadilla' }));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    await user.click(screen.getByRole('dialog'));
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
